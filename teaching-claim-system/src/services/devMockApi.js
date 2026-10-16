/*
 * API จำลองสำหรับโหมดทดลอง (ดู services/devAuth.js)
 * ตอบกลับรูปแบบเดียวกับ backend จริง เก็บข้อมูลในหน่วยความจำ — รีเฟรชหน้าแล้วกลับเป็นค่าเริ่มต้น
 */
import { getDevUser } from "./devAuth";

const DAY = 86400000;
const now = Date.now();
const iso = (offsetDays) => new Date(now + offsetDays * DAY).toISOString();
const dateOnly = (offsetDays) => iso(offsetDays).slice(0, 10);

const TERMS = [
  { id: 1, year: 2568, semester: 2, start_date: "2026-01-12", end_date: "2026-05-15" },
  { id: 2, year: 2568, semester: 3, start_date: "2026-06-01", end_date: "2026-07-31" },
  { id: 3, year: 2569, semester: 1, start_date: "2026-08-10", end_date: "2026-12-11" },
];

const PERIODS = [
  { id: 1, term_id: 3, month: 9, status: 0, open_at: iso(-40), close_at: iso(-30) },
  { id: 2, term_id: 3, month: 10, status: 1, open_at: iso(-5), close_at: iso(5) },
  { id: 3, term_id: 3, month: 11, status: 0, open_at: iso(15), close_at: iso(25) },
];

const COURSES = [
  { section_id: 1, course_code: "CS341", course_name_th: "วิศวกรรมซอฟต์แวร์", section_no: "650001", role: "INSTRUCTOR", hour: 12, max_hour: 45 },
  { section_id: 3, course_code: "CS361", course_name_th: "การออกแบบสถาปัตยกรรมซอฟต์แวร์บนคลาวด์", section_no: "650001", role: "INSTRUCTOR", hour: 15, max_hour: 45 },
  { section_id: 4, course_code: "CS213", course_name_th: "โครงสร้างข้อมูล", section_no: "650001", role: "INSTRUCTOR", hour: 6, max_hour: 45 },
];

const PEOPLE = [
  { sub: "dev-teacher", name: "อ.ทดลอง ระบบ", email: "teacher@dev.local", role: "TEACHER" },
  { sub: "t-02", name: "อ.สมหญิง ตั้งใจสอน", email: "somying@dev.local", role: "TEACHER" },
  { sub: "t-03", name: "อ.วิชัย รักเรียน", email: "wichai@dev.local", role: "TEACHER" },
  { sub: "ta-01", name: "นายภูมิ ช่วยสอน", email: "phum@dev.local", role: "TA" },
];

const STATUSES = ["SUBMITTED", "SUBMITTED", "SUBMITTED", "RETURNED", "APPROVED", "APPROVED", "DRAFT"];

// UUID v4 แบบสุ่ม (รหัสคำขอใช้ 4 ตัวแรก จึงต้องไม่ซ้ำกัน)
const uuid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () =>
        Math.floor(Math.random() * 16).toString(16)
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
    decision_comment: status === "RETURNED" ? "ลายเซ็นในใบลงเวลาไม่ครบ กรุณาแนบใหม่" : null,
    created_at: iso(-12 + i * 0.5),
    submitted_at: status === "DRAFT" ? null : iso(-11 + i * 0.5),
    updated_at: iso(-11 + i * 0.5),
  };
});

let logs = claims
  .filter((c) => c.status !== "DRAFT")
  .flatMap((c, i) => {
    const entries = [
      { action: "SUBMIT", from_status: "Draft", to_status: "Submitted", actor_name: c.claimant_name, actor_role: c.claimant_role, created_at: c.submitted_at },
    ];
    if (c.status === "APPROVED") {
      entries.push({ action: "APPROVE", from_status: "Submitted", to_status: "Approved", actor_name: "เจ้าหน้าที่ตรวจสอบ (ทดลอง)", actor_role: "REVIEWER", created_at: iso(-3 + i * 0.1) });
    }
    if (c.status === "RETURNED") {
      entries.push({ action: "RETURN", from_status: "Submitted", to_status: "Returned", actor_name: "เจ้าหน้าที่ตรวจสอบ (ทดลอง)", actor_role: "REVIEWER", comment: c.decision_comment, created_at: iso(-2 + i * 0.1) });
    }
    return entries.map((e, j) => ({ id: `log-${i}-${j}`, claim_id: c.id, claim_code: c.course_code, comment: null, ...e }));
  });

const ACTION_TO_STATUS = { APPROVE: "APPROVED", RETURN: "RETURNED", REJECT: "REJECTED" };
const STATUS_LABEL = { SUBMITTED: "Submitted", APPROVED: "Approved", RETURNED: "Returned", REJECTED: "Rejected", DRAFT: "Draft" };

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
  </svg>`
)}`;

function error(status, message) {
  const err = new Error(message);
  err.status = status;
  err.data = { message };
  return err;
}

export async function devMockRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://dev.local");
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "claims", id, "actions"]
  const body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : options.body || {};
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
      return { periods: clone(PERIODS.filter((p) => !termId || String(p.term_id) === termId)) };
    }

    case "courses": {
      const termId = url.searchParams.get("term_id");
      return { courses: !termId || termId === "3" ? clone(COURSES) : [] };
    }

    case "audit-logs":
      return { logs: clone(logs), next_cursor: null };

    case "claims": {
      if (!id) {
        if (method === "GET") {
          const scope = url.searchParams.get("scope");
          const list =
            scope === "review"
              ? claims.filter((c) => c.status !== "DRAFT")
              : claims.filter((c) => c.owner_sub === user?.cognitoSub);
          return { claims: clone(list) };
        }

        if (method === "POST") {
          const claim = {
            ...body,
            id: uuid(),
            status: String(body.status ?? "1") === "0" ? "DRAFT" : "SUBMITTED",
            date: body.date || [],
            owner_sub: user?.cognitoSub,
            claimant_name: user?.name,
            claimant_email: user?.email,
            claimant_role: user?.roleKey,
            course_code: COURSES.find((c) => c.section_id === Number(body.section_id))?.course_code || "",
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

      if (sub === "actions" && method === "POST") {
        const next = ACTION_TO_STATUS[body.action];
        if (!next) throw error(400, "action ไม่ถูกต้อง");
        if (claim.status !== "SUBMITTED") throw error(409, "คำขอนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ");

        addLog(claim, body.action, claim.status, next, body.comment);
        claim.status = next;
        claim.decision_comment = body.comment || null;
        claim.decision_by = user?.name || "";
        claim.updated_at = new Date().toISOString();
        return { claim: clone(claim) };
      }

      if (sub === "resubmit") {
        addLog(claim, "RESUBMIT", claim.status, "SUBMITTED");
        Object.assign(claim, body, { status: "SUBMITTED", updated_at: new Date().toISOString() });
        return { claim: clone(claim) };
      }

      if (sub === "history") {
        return {
          history: clone(logs.filter((l) => l.claim_id === id)),
        };
      }

      if (sub === "evidence") {
        if (method === "GET") {
          // คำขอที่ยื่นแล้วมีไฟล์ตัวอย่าง 1 ไฟล์ (ผู้ตรวจต้องเห็นหลักฐานก่อนอนุมัติ)
          const evidence =
            claim.status === "DRAFT"
              ? []
              : [
                  {
                    id: `ev-${claim.id}`,
                    file_name: "ใบลงเวลาสอน (ตัวอย่าง).svg",
                    content_type: "image/svg+xml",
                    file_size: 2048,
                    download_url: SAMPLE_EVIDENCE_URL,
                  },
                ];
          return { evidence, count: evidence.length, hasEvidence: evidence.length > 0 };
        }
        return { ok: true };
      }

      return clone(claim);
    }

    default:
      throw error(404, `ไม่มี endpoint จำลองสำหรับ ${path}`);
  }
}
