import { getIdToken } from "./auth";
import { getDevUser } from "./devAuth";
import { devMockRequest } from "./devMockApi";

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

  const token = await getIdToken();

  if (!token) {
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
export function getClaims(scope) {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";

  return apiRequest(`/api/claims${query}`, {
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
  return apiRequest("/api/term", {
    method: "GET",
  });
}

/*
 * =====================
 * Submission periods
 * =====================
 */

export function getPeriods(termId) {
  const query =
    termId !== undefined && termId !== null && termId !== ""
      ? `?term_id=${encodeURIComponent(termId)}`
      : "";

  return apiRequest(`/api/period${query}`, {
    method: "GET",
  });
}

/*
 * =====================
 * Teaching assignments
 * =====================
 */

export function getCourses(termId) {
  const query =
    termId !== undefined && termId !== null && termId !== ""
      ? `?term_id=${encodeURIComponent(termId)}`
      : "";

  return apiRequest(`/api/courses${query}`, {
    method: "GET",
  });
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
 * backend ต้องตรวจสิทธิ์และสถานะปัจจุบันเอง (ไม่ตรง → 409)
 */

const VALID_ACTIONS = new Set(["REVIEW_PASS", "APPROVE", "REJECT", "RETURN"]);

// comment: เหตุผล (บังคับเมื่อ REJECT / RETURN)
export function submitClaimAction(claimId, action, comment) {
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
 * ผู้ยื่นแก้ไขคำขอที่ถูกส่งคืน (สถานะ 5) แล้วส่งอีกครั้งบนคำขอเดิม
 * Body เหมือน POST /api/claims (academic_term, period_id, section_id, status, date, note)
 */
export function resubmitClaim(claimId, payload) {
  return apiRequest(
    `/api/claims/${encodeURIComponent(claimId)}/resend`,
    {
      method: "POST",
      body: payload,
    },
  );
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
