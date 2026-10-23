/*
 * API จำลองสำหรับโหมดทดลอง (ดู services/devAuth.js)
 * ตอบกลับรูปแบบเดียวกับ backend จริง เก็บข้อมูลในหน่วยความจำ — รีเฟรชหน้าแล้วกลับเป็นค่าเริ่มต้น
 */
import { getDevUser } from "./devAuth";
import { PERMISSION as P, can, maskEmail } from "../data/roles";

const DAY = 86400000;
const now = Date.now();
const iso = (offsetDays) => new Date(now + offsetDays * DAY).toISOString();
const dateOnly = (offsetDays) => iso(offsetDays).slice(0, 10);

const TERMS = [
  {
    id: 1,
    year: 2568,
    semester: 2,
    start_date: "2026-01-12",
    end_date: "2026-05-15",
  },
  {
    id: 2,
    year: 2568,
    semester: 3,
    start_date: "2026-06-01",
    end_date: "2026-07-31",
  },
  {
    id: 3,
    year: 2569,
    semester: 1,
    start_date: "2026-08-10",
    end_date: "2026-12-11",
  },
];

const PERIODS = [
  {
    id: 1,
    term_id: 3,
    month: 9,
    status: 0,
    open_at: iso(-40),
    close_at: iso(-30),
  },
  {
    id: 2,
    term_id: 3,
    month: 10,
    status: 1,
    open_at: iso(-5),
    close_at: iso(5),
  },
  {
    id: 3,
    term_id: 3,
    month: 11,
    status: 0,
    open_at: iso(15),
    close_at: iso(25),
  },
];

const COURSES = [
  {
    section_id: 1,
    course_code: "CS341",
    course_name_th: "วิศวกรรมซอฟต์แวร์",
    section_no: "650001",
    role: "INSTRUCTOR",
    hour: 12,
    max_hour: 45,
  },
  {
    section_id: 3,
    course_code: "CS361",
    course_name_th: "การออกแบบสถาปัตยกรรมซอฟต์แวร์บนคลาวด์",
    section_no: "650001",
    role: "INSTRUCTOR",
    hour: 15,
    max_hour: 45,
  },
  {
    section_id: 4,
    course_code: "CS213",
    course_name_th: "โครงสร้างข้อมูล",
    section_no: "650001",
    role: "INSTRUCTOR",
    hour: 6,
    max_hour: 45,
  },
];

const PEOPLE = [
  {
    sub: "dev-teacher",
    name: "อ.ทดลอง ระบบ",
    email: "teacher@dev.local",
    role: "TEACHER",
  },
  {
    sub: "t-02",
    name: "อ.สมหญิง ตั้งใจสอน",
    email: "somying@dev.local",
    role: "TEACHER",
  },
  {
    sub: "t-03",
    name: "อ.วิชัย รักเรียน",
    email: "wichai@dev.local",
    role: "TEACHER",
  },
  {
    sub: "ta-01",
    name: "นายภูมิ ช่วยสอน",
    email: "phum@dev.local",
    role: "TA",
  },
];

const STATUSES = [
  "SUBMITTED",
  "SUBMITTED",
  "REVIEWED",
  "RETURNED",
  "APPROVED",
  "PAID",
  "REJECTED",
  "DRAFT",
];

// UUID v4 แบบสุ่ม (รหัสคำขอใช้ 4 ตัวแรก จึงต้องไม่ซ้ำกัน)
const uuid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () =>
        Math.floor(Math.random() * 16).toString(16),
      );

let claims = Array.from({ length: 18 }, (_, i) => {
  const person = PEOPLE[i % PEOPLE.length];
  const course = COURSES[i % COURSES.length];
  const status = STATUSES[i % STATUSES.length];
  const hour = 2 + (i % 4);

  return {
    id: uuid(),
    status,
    academic_term: 3,
    period_id: 2,
    period_month: 10,
    section_id: course.section_id,
    course_code: course.course_code,
    course_name: course.course_name_th,
    date: [{ id: i + 1, date: dateOnly(-10 - (i % 6)), hour }],
    hour,
    note: i % 3 === 0 ? "สอนชดเชยวันหยุดราชการ" : null,
    owner_sub: person.sub,
    claimant_name: person.name,
    claimant_email: person.email,
    claimant_role: person.role,
    // REVIEWED = ผู้ตรวจสอบส่งต่อแล้ว (ให้ผู้อนุมัติมีงานให้ทดลอง)
    reviewed_at: status === "REVIEWED" ? iso(-18 + i) : null,
    reviewed_by_name: status === "REVIEWED" ? "เจ้าหน้าที่ตรวจสอบ (ทดลอง)" : "",
    decision_comment:
      status === "RETURNED"
        ? "ลายเซ็นในใบลงเวลาไม่ครบ กรุณาแนบใหม่"
        : status === "REJECTED"
          ? "ชั่วโมงสอนที่เบิกเกินสิทธิ์ตามเงื่อนไขของรายวิชา"
          : null,
    paid_at: status === "PAID" ? iso(-4) : null,
    // ข้อมูลทดลอง: ส่งเลขเต็มมาเพื่อทดสอบว่าหน้าเว็บปิดบังให้
    payment_bank_name: status === "PAID" ? "ธนาคารกรุงไทย" : "",
    payment_account_no: status === "PAID" ? "1234567890" : "",
    // ยื่นห่างกันวันละรายการ (ย้อนหลัง ~3 สัปดาห์) → มีทั้งที่ยังทันและเกินกำหนด 10 วันทำการ
    created_at: iso(-22 + i),
    submitted_at: status === "DRAFT" ? null : iso(-21 + i),
    updated_at: iso(-21 + i),
  };
});

// เวลาที่เจ้าหน้าที่ดำเนินการ = หลังวันยื่น n วัน
const afterSubmit = (claim, days) =>
  new Date(new Date(claim.submitted_at).getTime() + days * DAY).toISOString();

let logs = claims
  .filter((c) => c.status !== "DRAFT")
  .flatMap((c, i) => {
    const entries = [
      {
        action: "SUBMIT",
        from_status: "Draft",
        to_status: "Submitted",
        actor_name: c.claimant_name,
        actor_role: c.claimant_role,
        created_at: c.submitted_at,
      },
    ];
    if (c.status === "APPROVED") {
      entries.push({
        action: "APPROVE",
        from_status: "Submitted",
        to_status: "Approved",
        actor_name: "เจ้าหน้าที่ตรวจสอบ (ทดลอง)",
        actor_role: "REVIEWER",
        created_at: afterSubmit(c, 2),
      });
    }
    if (c.status === "REJECTED") {
      entries.push({
        action: "REJECT",
        from_status: "Submitted",
        to_status: "Rejected",
        actor_name: "ผู้อนุมัติ (ทดลอง)",
        actor_role: "APPROVER",
        comment: c.decision_comment,
        created_at: afterSubmit(c, 3),
      });
    }
    if (c.status === "RETURNED") {
      entries.push({
        action: "RETURN",
        from_status: "Submitted",
        to_status: "Returned",
        actor_name: "เจ้าหน้าที่ตรวจสอบ (ทดลอง)",
        actor_role: "REVIEWER",
        comment: c.decision_comment,
        created_at: afterSubmit(c, 3),
      });
    }
    return entries.map((e, j) => ({
      id: `log-${i}-${j}`,
      claim_id: c.id,
      claim_code: c.course_code,
      comment: null,
      ...e,
    }));
  });

// path → { action ใน audit log, สถานะที่ทำได้, สถานะใหม่, สิทธิ์ที่ต้องมี }
const ACTION_ROUTES = {
  pass: {
    action: "REVIEW_PASS",
    from: ["SUBMITTED"],
    to: "REVIEWED",
    permission: P.CLAIM_REVIEW,
  },
  approve: {
    action: "APPROVE",
    from: ["REVIEWED"],
    to: "APPROVED",
    permission: P.CLAIM_APPROVE,
  },
  reject: {
    action: "REJECT",
    from: ["REVIEWED"],
    to: "REJECTED",
    permission: P.CLAIM_APPROVE,
    requireComment: true,
  },
  return: {
    action: "RETURN",
    from: ["SUBMITTED", "REVIEWED"],
    to: "RETURNED",
    requireComment: true,
  },
};

const ACTIONS_BY_NAME = Object.fromEntries(
  Object.values(ACTION_ROUTES).map((route) => [route.action, route]),
);

const STATUS_LABEL = {
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
  PAID: "Paid",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  DRAFT: "Draft",
};

function addLog(claim, action, from, to, comment) {
  const user = getDevUser();
  logs = [
    {
      id: `log-${Date.now()}`,
      claim_id: claim.id,
      claim_code: claim.course_code,
      action,
      from_status: STATUS_LABEL[from] || from,
      to_status: STATUS_LABEL[to] || to,
      actor_name: user?.name || "",
      actor_role: user?.roleKey || "",
      comment: comment || null,
      created_at: new Date().toISOString(),
    },
    ...logs,
  ];
}

// หลักฐานที่ลงทะเบียนผ่านโหมดทดลอง (claim_id → รายการไฟล์)
const devEvidence = {};

const clone = (value) => JSON.parse(JSON.stringify(value));

// รูปหลักฐานตัวอย่าง (SVG ฝังในโค้ด ไม่ต้องโหลดจาก S3)
const SAMPLE_EVIDENCE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="600" height="400" fill="#F4F7F9"/>
    <rect x="40" y="40" width="520" height="320" rx="12" fill="#fff" stroke="#DCEEF2"/>
    <text x="300" y="120" font-size="28" text-anchor="middle" fill="#1E5687" font-family="sans-serif">ใบลงเวลาสอน (ตัวอย่าง)</text>
    <text x="300" y="170" font-size="16" text-anchor="middle" fill="#64748B" font-family="sans-serif">ข้อมูลจำลองสำหรับโหมดทดลอง</text>
    <line x1="120" y1="290" x2="260" y2="290" stroke="#64748B"/>
    <line x1="340" y1="290" x2="480" y2="290" stroke="#64748B"/>
    <text x="190" y="315" font-size="14" text-anchor="middle" fill="#64748B" font-family="sans-serif">ผู้สอน</text>
    <text x="410" y="315" font-size="14" text-anchor="middle" fill="#64748B" font-family="sans-serif">หัวหน้าภาค</text>
  </svg>`,
)}`;

function error(status, message) {
  const err = new Error(message);
  err.status = status;
  err.data = { message };
  return err;
}

/*
 * จำลองการตรวจสิทธิ์ฝั่ง backend — ตอบ 403 เหมือนของจริง เพื่อทดสอบว่า UI รับมือได้
 * (backend จริงต้องตรวจแบบเดียวกันนี้ทุก endpoint ไม่พึ่งการซ่อนปุ่มฝั่ง UI)
 */
function requirePermission(user, ...permissions) {
  if (!permissions.some((permission) => can(user, permission))) {
    throw error(403, "คุณไม่มีสิทธิ์ดำเนินการนี้ (ข้อมูลจำลอง)");
  }
}

// ผู้ยื่นเห็นได้เฉพาะคำขอของตัวเอง ผู้มีสิทธิ์ดูคิวเห็นของผู้อื่นได้ — คืน true ถ้าเป็นเจ้าของ
function requireClaimAccess(user, claim) {
  const own = claim.owner_sub === user?.cognitoSub;

  if (!own && !can(user, P.CLAIM_VIEW_ALL)) {
    throw error(403, "คุณไม่มีสิทธิ์ดูคำขอนี้ (ข้อมูลจำลอง)");
  }

  return own;
}

// ผู้ที่ไม่มีสิทธิ์ดูข้อมูลส่วนบุคคลจะได้อีเมลที่ถูกปิดบังจาก backend (ไม่ใช่แค่ซ่อนที่หน้าจอ)
function redactClaim(user, claim) {
  if (can(user, P.PII_VIEW) || claim.owner_sub === user?.cognitoSub) {
    return claim;
  }

  return { ...claim, claimant_email: maskEmail(claim.claimant_email) };
}

const DEV_AUTO_PAY_MS = 30 * 1000;

// อนุมัติแล้วเกินเวลาที่กำหนด → จ่ายเงินแล้ว (จำลองงานตั้งเวลาของ backend)
function autoPayApproved() {
  const now = Date.now();

  claims.forEach((claim) => {
    if (
      claim.status === "APPROVED" &&
      claim.approved_at &&
      now - new Date(claim.approved_at).getTime() >= DEV_AUTO_PAY_MS
    ) {
      addLog(claim, "AUTO_PAY", "APPROVED", "PAID", "ระบบจ่ายเงินอัตโนมัติ (โหมดทดลอง)");
      claim.status = "PAID";
      claim.paid_at = new Date().toISOString();
      claim.payment_bank_name = "ธนาคารกรุงไทย";
      claim.payment_account_no = "1234567890";
      claim.updated_at = claim.paid_at;
    }
  });
}

export async function devMockRequest(path, options = {}) {
  autoPayApproved();

  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://dev.local");
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "claims", id, "actions"]
  const body =
    typeof options.body === "string"
      ? JSON.parse(options.body || "{}")
      : options.body || {};
  const user = getDevUser();

  // หน่วงนิดหน่อยให้เห็นสถานะกำลังโหลดเหมือนของจริง
  await new Promise((resolve) => setTimeout(resolve, 150));

  console.log(`[DEV MOCK] ${method} ${path}`);

  const [, resource, id, sub] = parts;

  switch (resource) {
    case "auth":
      return { ok: true };

    case "term":
      return { terms: clone(TERMS) };

    case "period": {
      const termId = url.searchParams.get("term_id");
      return {
        periods: clone(
          PERIODS.filter((p) => !termId || String(p.term_id) === termId),
        ),
      };
    }

    case "courses": {
      const termId = url.searchParams.get("term_id");
      return { courses: !termId || termId === "3" ? clone(COURSES) : [] };
    }

    case "audit-logs": {
      requirePermission(user, P.AUDIT_VIEW_ALL);

      // กรองแบบเดียวกับที่ backend ควรทำ: actor / action / from / to
      const actor = (url.searchParams.get("actor") || "").toLowerCase();
      const action = url.searchParams.get("action") || "";
      const from = url.searchParams.get("from") || "";
      const to = url.searchParams.get("to") || "";

      const filtered = logs.filter((l) => {
        const ownerEmail =
          claims.find((c) => c.id === l.claim_id)?.claimant_email || "";
        const at = String(l.created_at);

        return (
          (!actor ||
            String(l.actor_name).toLowerCase().includes(actor) ||
            (l.actor_name ===
              claims.find((c) => c.id === l.claim_id)?.claimant_name &&
              ownerEmail.toLowerCase().includes(actor))) &&
          (!action || l.action === action) &&
          (!from || at.slice(0, 10) >= from) &&
          (!to || new Date(at) <= new Date(to))
        );
      });

      // ใหม่สุดก่อน
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return { logs: clone(filtered), next_cursor: null };
    }

    case "claims": {
      if (!id) {
        if (method === "GET") {
          const scope = url.searchParams.get("scope");

          requirePermission(
            user,
            scope === "review" ? P.CLAIM_VIEW_ALL : P.CLAIM_CREATE,
          );

          const list =
            scope === "review"
              ? claims
                  .filter((c) => c.status !== "DRAFT")
                  .map((c) => redactClaim(user, c))
              : claims.filter((c) => c.owner_sub === user?.cognitoSub);
          return { claims: clone(list) };
        }

        if (method === "POST") {
          requirePermission(user, P.CLAIM_CREATE);

          const claim = {
            ...body,
            id: uuid(),
            status: String(body.status ?? "1") === "0" ? "DRAFT" : "SUBMITTED",
            date: body.date || [],
            owner_sub: user?.cognitoSub,
            claimant_name: user?.name,
            claimant_email: user?.email,
            claimant_role: user?.roleKey,
            course_code:
              COURSES.find((c) => c.section_id === Number(body.section_id))
                ?.course_code || "",
            created_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          };
          claims = [claim, ...claims];
          return { id: claim.id, claim: clone(claim) };
        }

        if (method === "DELETE") {
          claims = claims.filter((c) => c.id !== body.id);
          return { ok: true };
        }
      }

      const claim = claims.find((c) => c.id === id);
      if (!claim) throw error(404, "ไม่พบคำขอ (ข้อมูลจำลอง)");

      const isOwner = requireClaimAccess(user, claim);

      // POST /api/claims/{id}/pass | approve | reject | return
      const route =
        sub === "actions" ? ACTIONS_BY_NAME[body.action] : ACTION_ROUTES[sub];

      if (sub === "actions" && !route && method === "POST") {
        throw error(400, "ไม่รู้จัก action ที่ระบุ");
      }

      if (route && method === "POST") {
        if (route.permission) {
          requirePermission(user, route.permission);
        } else if (claim.status === "SUBMITTED") {
          // ส่งคืนตอนรอตรวจ = งานผู้ตรวจสอบ
          requirePermission(user, P.CLAIM_REVIEW);
        } else {
          // ส่งคืนตอนรออนุมัติ = งานผู้อนุมัติ
          requirePermission(user, P.CLAIM_APPROVE);
        }

        // /pass และการส่งคืนตอนรอตรวจ ทำได้เฉพาะผู้ตรวจสอบ (ไม่ใช่ผู้อนุมัติ)
        if (claim.status === "SUBMITTED" && can(user, P.CLAIM_APPROVE))
          throw error(403, "ขั้นรอตรวจเป็นงานของผู้ตรวจสอบ (ข้อมูลจำลอง)");

        if (isOwner)
          throw error(
            403,
            "ไม่สามารถตรวจสอบหรืออนุมัติคำขอของตัวเองได้ (ข้อมูลจำลอง)",
          );

        if (!route.from.includes(claim.status))
          throw error(409, "สถานะของคำขอไม่ตรงกับขั้นตอนนี้ (ข้อมูลจำลอง)");

        if (route.requireComment && !String(body.comment || "").trim())
          throw error(400, "กรุณาระบุเหตุผล");

        const now = new Date().toISOString();

        addLog(claim, route.action, claim.status, route.to, body.comment);
        claim.status = route.to;
        claim.updated_at = now;

        if (route.action === "REVIEW_PASS") {
          claim.reviewed_at = now;
          claim.reviewed_by_name = user?.name || "";
        } else {
          claim.decision_comment = body.comment || null;
          claim.decision_by = user?.name || "";
        }

        // จำลองระบบจ่ายเงินอัตโนมัติ: อนุมัติแล้วรอสักพัก (โหมดทดลอง 30 วินาที) สถานะเปลี่ยนเป็น "จ่ายเงินแล้ว"
        // ของจริง backend ต้องมีงานตั้งเวลา (เช่น EventBridge + Lambda) ทำแทนส่วนนี้
        if (route.action === "APPROVE") {
          claim.approved_at = now;
        }

        return { claim: clone(claim) };
      }

      // แก้ไขคำร้องที่ถูกส่งคืน แล้วส่งอีกครั้งบนคำขอเดิม
      if (sub === "resend" && method === "POST") {
        if (!isOwner) throw error(403, "ส่งใหม่ได้เฉพาะเจ้าของคำขอ (ข้อมูลจำลอง)");

        if (claim.status !== "RETURNED") {
          throw error(409, "ส่งใหม่ได้เฉพาะคำร้องที่ถูกส่งคืนแก้ไข");
          throw error(409, "แก้ไขได้เฉพาะคำร้องที่ถูกส่งกลับ");
        }

        Object.assign(claim, body, {
          id: claim.id,
          status: "RETURNED",
          updated_at: new Date().toISOString(),
        });

        return { claim: clone(claim) };
      }

      // ยื่นคำร้องเดิมอีกครั้งหลังแก้ไข
      if (sub === "submit" && method === "POST") {
        if (!isOwner)
          throw error(403, "ยื่นใหม่ได้เฉพาะเจ้าของคำขอ (ข้อมูลจำลอง)");

        if (claim.status !== "RETURNED") {
          throw error(409, "ยื่นซ้ำได้เฉพาะคำร้องที่ถูกส่งกลับ");
        }

        addLog(claim, "RESUBMIT", "RETURNED", "SUBMITTED");

        Object.assign(claim, body, {
          id: claim.id,
          status: "SUBMITTED",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        return { claim: clone(claim) };
      }

      if (sub === "history") {
        requirePermission(user, P.AUDIT_VIEW);

        return {
          history: clone(logs.filter((l) => l.claim_id === id)),
        };
      }

      if (sub === "evidence") {
        if (method === "GET") {
          requirePermission(user, P.EVIDENCE_VIEW);

          // คำขอที่ยื่นแล้ว: ไฟล์ที่ลงทะเบียนไว้ + ไฟล์ตัวอย่าง (เอกสารลงนาม + หลักฐานประกอบ)
          const registered = devEvidence[claim.id] || [];
          const evidence =
            claim.status === "DRAFT"
              ? []
              : registered.length > 0
                ? registered
                : [
                    {
                      id: `ev-signed-${claim.id}`,
                      file_name: "แบบขอเบิกที่ลงนามแล้ว (ตัวอย่าง).svg",
                      content_type: "image/svg+xml",
                      file_size: 2048,
                      evidence_type: "signed_form",
                      download_url: SAMPLE_EVIDENCE_URL,
                    },
                    {
                      id: `ev-${claim.id}`,
                      file_name: "ใบลงเวลาสอน (ตัวอย่าง).svg",
                      content_type: "image/svg+xml",
                      file_size: 2048,
                      evidence_type: "supporting",
                      download_url: SAMPLE_EVIDENCE_URL,
                    },
                  ];
          return {
            evidence,
            count: evidence.length,
            hasEvidence: evidence.length > 0,
          };
        }

        // ลงทะเบียนไฟล์ที่อัปโหลดแล้ว (จำประเภทไว้ให้ทดสอบเงื่อนไข "ต้องมีเอกสารลงนาม")
        if (method === "POST" && body?.file_name) {
          devEvidence[claim.id] = [
            ...(devEvidence[claim.id] || []),
            {
              id: `ev-${Date.now()}-${(devEvidence[claim.id] || []).length}`,
              file_name: body.file_name || "ไฟล์แนบ",
              content_type: body.content_type || "",
              file_size: body.file_size || 0,
              evidence_type: body.evidence_type || "supporting",
              download_url: SAMPLE_EVIDENCE_URL,
            },
          ];
        }
        return { ok: true };
      }

      return clone(redactClaim(user, claim));
    }

    default:
      throw error(404, `ไม่มี endpoint จำลองสำหรับ ${path}`);
  }
}