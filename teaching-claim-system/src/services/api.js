import { getIdToken } from "./auth";
import { getDevUser } from "./devAuth";
import { devMockRequest } from "./devMockApi";
import { ESCALATE_TAG } from "../data/workflow";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export const AUTH_EXPIRED_EVENT = "teaching-claim:auth-expired";

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function apiRequest(path, options = {}) {
  // โหมดทดลองตอน dev → ใช้ข้อมูลจำลอง ไม่เรียก backend จริง (ดู devAuth.js)
  if (getDevUser()) {
    return devMockRequest(path, options);
  }

  if (!API_URL) {
    throw new Error("VITE_API_URL is not configured");
  }

  const { headers = {}, body, ...fetchOptions } = options;

  const token = await getIdToken().catch(() => null);

  // ไม่มี token (session หาย/ถูกล้าง) → ถือเป็นหมดอายุ ให้ App พาไปหน้า Login เหมือน 401
  if (!token) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    throw new Error("NO_AUTH_TOKEN");
  }

  const finalHeaders = {
    Authorization: token,
    ...headers,
  };

  let requestBody = body;

  if (
    body !== undefined &&
    body !== null &&
    typeof body !== "string" &&
    !(body instanceof FormData)
  ) {
    finalHeaders["Content-Type"] = "application/json";

    requestBody = JSON.stringify(body);
  }

  // log JSON ที่ส่งไป /api/claims ทุกครั้ง เพื่อตรวจ contract กับ Lambda
  // log เฉพาะตอนพัฒนา — response มีข้อมูลส่วนบุคคล/การเงิน ห้ามค้างใน console ของ production
  const isClaimsRequest = import.meta.env.DEV && path.startsWith("/api/claims");

  const method = fetchOptions.method || "GET";

  if (isClaimsRequest) {
    console.log(`[API] ${method} ${path} body:`, requestBody ?? "(no body)");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: finalHeaders,

    ...(body !== undefined
      ? {
          body: requestBody,
        }
      : {}),
  });

  const data = await parseResponse(response);

  if (isClaimsRequest) {
    console.log(`[API] ${method} ${path} → ${response.status}`, data);
  }

  /*
   * 401 = token หมดอายุ/ไม่ถูกต้อง → แจ้ง App ให้พาไปหน้า Login
   * (403 = ล็อกอินอยู่แต่ไม่มีสิทธิ์ → ให้หน้านั้นแสดงข้อความเอง ไม่ต้องออกจากระบบ)
   */
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        (response.status === 403
          ? "คุณไม่มีสิทธิ์ดำเนินการนี้"
          : `API error ${response.status}`),
    );

    error.status = response.status;

    error.data = data;

    throw error;
  }

  return data;
}

/*
 * =====================
 * Cache ข้อมูลอ้างอิงที่แทบไม่เปลี่ยน (ภาคการศึกษา, ประเภทค่าตอบแทน)
 *
 * - เก็บในหน่วยความจำเท่านั้น (รีเฟรชหน้า = โหลดใหม่) อายุ LOOKUP_TTL
 * - เก็บ promise ไม่ใช่ผลลัพธ์ → หลายหน้าขอพร้อมกันระหว่างรอ ได้ request เดียวกัน
 * - โหลดพลาดไม่เก็บ ครั้งหน้าลองใหม่
 * - ห้ามใช้กับข้อมูลที่เปลี่ยนบ่อย เช่น claims
 * =====================
 */

const LOOKUP_TTL = 5 * 60 * 1000;
const lookupCache = new Map(); // key → { at, promise }

function cachedRequest(key, request) {
  const hit = lookupCache.get(key);

  if (hit && Date.now() - hit.at < LOOKUP_TTL) {
    return hit.promise;
  }

  const promise = request().catch((error) => {
    // ลบเฉพาะถ้ายังเป็นตัวเดียวกัน (ระหว่างรออาจถูกล้าง/แทนที่ไปแล้ว)
    if (lookupCache.get(key)?.promise === promise) {
      lookupCache.delete(key);
    }
    throw error;
  });

  lookupCache.set(key, { at: Date.now(), promise });

  return promise;
}

// ล้างตอนออกจากระบบ (ไม่ให้ข้อมูลค้างไปถึงผู้ใช้คนถัดไป) หรือหลังแก้ข้อมูลนั้นเอง
export function clearApiCache(key) {
  if (key) {
    lookupCache.delete(key);
  } else {
    lookupCache.clear();
  }
}

/*
 * =====================
 * Authentication / User
 * =====================
 */

export function syncCurrentUser() {
  return apiRequest("/api/auth/me", {
    method: "POST",
  });
}

/*
 * =====================
 * Claims
 * =====================
 */

/*
 * scope "mine"   = คำขอของตัวเอง (ค่าเริ่มต้น)
 * scope "review" = คิวของเจ้าหน้าที่/ผู้อนุมัติ/ผู้ดูแล — backend ต้องตรวจสิทธิ์เอง
 */
export function getClaims(scope, pagination = {}) {
  const params = new URLSearchParams();

  if (scope) {
    params.set("scope", scope);
  }

  const { limit, offset } = pagination;

  if (limit !== undefined && limit !== null) {
    params.set("limit", String(limit));
  }

  if (offset !== undefined && offset !== null) {
    params.set("offset", String(offset));
  }

  const query = params.toString();

  return apiRequest(`/api/claims${query ? `?${query}` : ""}`, {
    method: "GET",
  });
}

/**
 * [V4] Report Generation & Export
 * เฉพาะ APPROVER และ ADMIN
 * Backend ต้องตรวจสิทธิ์ DATA_EXPORT เอง
 */
export function getReportClaims(filters = {}) {
  const params = new URLSearchParams({
    scope: "report",
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiRequest(`/api/claims?${params.toString()}`, {
    method: "GET",
  });
}

export function createClaim(payload) {
  return apiRequest("/api/claims", {
    method: "POST",
    body: payload,
  });
}

export function deleteClaim(claimId) {
  return apiRequest("/api/claims", {
    method: "DELETE",
    body: {
      id: claimId,
    },
  });
}

export function registerClaimEvidence(claimId, evidence) {
  return apiRequest(`/api/claims/${encodeURIComponent(claimId)}/evidence`, {
    method: "POST",

    body: {
      evidence_id: evidence.evidenceId,

      object_key: evidence.objectKey,

      file_name: evidence.fileName,

      content_type: evidence.contentType,

      file_size: evidence.fileSize,

      // signed_form = เอกสารลงนาม · supporting = หลักฐานประกอบการเบิก
      evidence_type: evidence.category || "supporting",
    },
  });
}

export function getClaimEvidence(claimId) {
  return apiRequest(`/api/claims/${encodeURIComponent(claimId)}/evidence`, {
    method: "GET",
  });
}

/*
 * =====================
 * Terms
 * =====================
 */

export function getTerms() {
  return cachedRequest("terms", () =>
    apiRequest("/api/term", {
      method: "GET",
    }),
  );
}

/*
 * =====================
 * Submission periods
 * =====================
 */

/*
 * query string ของ lookup API — ข้ามค่าว่าง
 * limit/offset = แบ่งหน้า (ไม่ส่ง limit = ทั้งหมด) · q = คำค้น
 * staff = none | assigned | used | full (/api/courses กรองตามผู้สอนใน section)
 */
function lookupQuery(termId, { all = false, limit, offset, q, staff } = {}) {
  const params = new URLSearchParams();

  if (termId !== undefined && termId !== null && termId !== "") {
    params.set("term_id", termId);
  }

  if (all) {
    params.set("all", "true");
  }

  if (limit !== undefined && limit !== null) {
    params.set("limit", String(limit));
    params.set("offset", String(offset || 0));
  }

  if (q) {
    params.set("q", q);
  }

  if (staff) {
    params.set("staff", staff);
  }

  return params.toString() ? `?${params}` : "";
}

// all = true → ทุกรอบ ไม่ว่าจะเปิดหรือปิด (หน้าจัดการระบบ)
// ส่ง limit → คืน { periods, total, limit, offset }
export function getPeriods(termId, options = {}) {
  return apiRequest(`/api/period${lookupQuery(termId, options)}`, {
    method: "GET",
  });
}

/*
 * =====================
 * Teaching assignments
 * =====================
 */

// all = true → ทุก section ในระบบ (ไม่กรองตามผู้สอน) ใช้ในหน้าจัดการระบบ
// ส่ง limit → คืน { courses, total, limit, offset } · q = ค้นรหัส/ชื่อวิชา
export function getCourses(termId, options = {}) {
  return apiRequest(`/api/courses${lookupQuery(termId, options)}`, {
    method: "GET",
  });
}

/*
 * =====================
 * Admin master data (เฉพาะ ADMIN) — Lambda ClaimAdminMasterData
 * =====================
 */

// คืน { users: [{ user_id, username, name }] }
export function getAdminUsers() {
  return apiRequest("/api/admin/users", { method: "GET" });
}

// { course_code, course_name_th, course_name_en, term_id, section_no } → { section_id }
export function createSection(payload) {
  return apiRequest("/api/admin/sections", { method: "POST", body: payload });
}

export function deleteSection(sectionId) {
  return apiRequest(`/api/admin/sections/${encodeURIComponent(sectionId)}`, {
    method: "DELETE",
  });
}

// คืน { staff: [{ section_id, user_id, username, name, role, hour, max_hour }] }
export function getSectionStaff(sectionId) {
  const query = sectionId ? `?section_id=${encodeURIComponent(sectionId)}` : "";
  return apiRequest(`/api/admin/section-staff${query}`, { method: "GET" });
}

// { section_id, user_id, role: INSTRUCTOR|TA, max_hour } — เพิ่มหรือแก้ (upsert)
export function saveSectionStaff(payload) {
  return apiRequest("/api/admin/section-staff", { method: "PUT", body: payload });
}

export function removeSectionStaff(sectionId, userId) {
  return apiRequest("/api/admin/section-staff", {
    method: "DELETE",
    body: { section_id: sectionId, user_id: userId },
  });
}

/*
 * ประเภทค่าตอบแทนจากตาราง compensation_type
 * คืน { types: [{ id, code, name, hourly_rate }] }
 */
export function getCompensationTypes() {
  return cachedRequest("compensation-types", () =>
    apiRequest("/api/compensation-types", {
      method: "GET",
    }),
  );
}

/*
 * =====================
 * [V3] Workflow & Audit
 *
 * ⚠️ path / body ด้านล่างเป็นข้อตกลงที่ frontend สมมติไว้
 * ให้ตรวจกับงาน #4 (Workflow API) และ #6 (Audit API) แล้วแก้ที่นี่ที่เดียว
 * =====================
 */

/*
 * action (key ใน data/workflow.js) → path ของ API
 *   REVIEW_PASS : 1 → 2  (ผู้ตรวจสอบเท่านั้น)
 *   APPROVE     : 2 → 3
 *   REJECT      : 2 → 4
 *   RETURN      : 1 หรือ 2 → 5
 *   (3 → 7 จ่ายเงินแล้ว: backend เปลี่ยนให้อัตโนมัติหลังอนุมัติครบกำหนดเวลา ไม่มี action จาก UI)
 * backend ต้องตรวจสิทธิ์และสถานะปัจจุบันเอง (ไม่ตรง → 409)
 */

const VALID_ACTIONS = new Set(["REVIEW_PASS", "APPROVE", "REJECT", "RETURN"]);

// comment: เหตุผล (บังคับเมื่อ REJECT / RETURN)
export function submitClaimAction(claimId, action, comment) {
  // ส่งต่อแบบขอให้ผู้อนุมัติตรวจหลักฐาน = REVIEW_PASS + ป้ายหน้าหมายเหตุ (ดู ESCALATE_TAG)
  if (action === "REVIEW_ESCALATE") {
    return submitClaimAction(
      claimId,
      "REVIEW_PASS",
      `${ESCALATE_TAG} ${comment?.trim() || ""}`,
    );
  }

  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`ไม่รู้จัก action: ${action}`);
  }

  return apiRequest(`/api/claims/${encodeURIComponent(claimId)}/actions`, {
    method: "POST",
    body: {
      action,
      comment: comment?.trim() || null,
    },
  });
}

/*
 * [V4] ส่งต่อคำขอที่ถูกต้องเป็นกลุ่มให้ผู้อนุมัติ (Batch Pass Review - TC2)
 */
export function batchReviewPass(claimIds = [], comment = "") {
  return apiRequest(`/api/claims/batch-actions`, {
    method: "POST",
    body: {
      action: "REVIEW_PASS",
      claimIds,
      comment: comment?.trim() || "ผ่านการตรวจสอบ (ส่งต่อผู้อนุมัติ)",
    },
  });
}

/*
 * ผู้ยื่นแก้ไขคำขอที่ถูกส่งคืน (สถานะ 5) แล้วส่งอีกครั้งบนคำขอเดิม
 * Body เหมือน POST /api/claims (academic_term, period_id, section_id, status, date, note)
 */
export function resubmitClaim(claimId, payload) {
  return apiRequest(`/api/claims/${encodeURIComponent(claimId)}/resend`, {
    method: "POST",
    body: payload,
  });
}

/*
 * Audit Log รวมทุกคำขอ (เฉพาะผู้มีสิทธิ์ audit.view_all)
 * filters: { actor, action, from, to, cursor, limit }
 * คืน { logs: [{ id, claim_id, claim_code, action, actor_name, actor_role,
 *               from_status, to_status, comment, created_at }], next_cursor }
 */
export function getAuditLogs(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return apiRequest(`/api/audit-logs${query ? `?${query}` : ""}`, {
    method: "GET",
  });
}

/*
 * ประวัติการดำเนินการของคำขอ (เรียงใหม่สุดก่อน หรือเก่าสุดก่อนก็ได้ UI จัดเรียงเอง)
 * คืน { history: [{ id, action, actor_name, actor_role, from_status,
 *                   to_status, comment, created_at }] }
 */
export function getClaimHistory(claimId) {
  return apiRequest(`/api/claims/${encodeURIComponent(claimId)}/history`, {
    method: "GET",
  });
}
