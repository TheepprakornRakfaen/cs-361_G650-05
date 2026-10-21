/*
 * [V3][Project 6] ข้อมูลการเงินจำลอง — ตาม "In-class setup & self-test"
 *
 * ทุกข้อมูลผูกกับ Cognito sub (claim "sub" ใน ID token) ไม่ใช่ชื่อหรืออีเมล
 *  - ตอนนี้ใช้ sub ของผู้ใช้ทดสอบจากตาราง app_user (TEMP_COGNITO_SUB)
 *    เมื่อสร้างผู้ใช้ทดสอบใน Cognito User Pool แล้ว ให้ใส่ sub จริงใน .env.local เช่น
 *      VITE_SUB_INST_A=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *    หรือแก้ค่า fallback ด้านล่างที่เดียว
 *  - เลขบัญชีเก็บเฉพาะแบบปกปิด (backend จริงต้องปกปิดก่อนส่งมา ห้ามส่งเลขเต็มให้ UI)
 *  - สิ่งที่ทดสอบเปลี่ยนได้ (ยืนยัน/รับรองชั่วโมง, ออกเอกสาร, รับหลักฐาน) เก็บใน localStorage
 *    เพื่อ Refresh / Logout-Login แล้วอ่านกลับได้ — ปุ่ม "Reset ข้อมูล" คืนค่า baseline
 *
 * TODO: แทนที่ด้วย API จริง (GET /api/finance/...) เมื่อ backend พร้อม
 */

const env = import.meta.env;

// sub จากตาราง app_user (ผู้ใช้ทดสอบใน Cognito User Pool)
export const TEMP_COGNITO_SUB = {
  INST_A: env.VITE_SUB_INST_A || "7498d458-a081-70ee-7f4a-645e4ba80b60", // teacher01@example.com
  INST_B: env.VITE_SUB_INST_B || "74086418-40d1-70da-8d1f-0d050f7e8779", // teacher02@example.com
  STAFF_1: env.VITE_SUB_STAFF_1 || "8468f4e8-2051-701c-6dcb-38bf0eaf0edc", // reviewer01@gmail.com
  STU_A: env.VITE_SUB_STU_A || "a40874d8-50d1-70ac-02d8-c97afa321252", // ta01@example.com
};

const S = TEMP_COGNITO_SUB;

/* บัญชีทดสอบ (Cognito group ตรงกับ GROUP_TO_ROLE ใน data/roles.js) */
export const FINANCE_ACCOUNTS = [
  {
    sub: S.INST_A,
    code: "INST-A",
    name: "INST-A (อาจารย์ผู้สอน)",
    email: "teacher01@example.com",
    group: "TEACHER",
    bank: { bankName: "BANK-A", accountMasked: "xxx-x-x1234-x" },
  },
  {
    sub: S.INST_B,
    code: "INST-B",
    name: "INST-B (อาจารย์ผู้สอน)",
    email: "teacher02@example.com",
    group: "TEACHER",
    bank: { bankName: "BANK-B", accountMasked: "xxx-x-x5678-x" },
  },
  {
    sub: S.STAFF_1,
    code: "STAFF-1",
    name: "STAFF-1 (เจ้าหน้าที่)",
    email: "reviewer01@gmail.com",
    group: "STAFF",
    bank: null,
  },
  {
    sub: S.STU_A,
    code: "STU-A",
    name: "STU-A (นักศึกษาช่วยงาน)",
    email: "ta01@example.com",
    group: "TA",
    bank: { bankName: "BANK-C", accountMasked: "xxx-x-x9012-x" },
  },
];

export const CLAIM_STATUS = {
  SIGNED_DOCS_RECEIVED: "SIGNED_DOCS_RECEIVED",
  SUBMITTED: "SUBMITTED",
  PAID: "PAID",
  UNCLAIMED: "UNCLAIMED",
};

export const CLAIM_STATUS_META = {
  SIGNED_DOCS_RECEIVED: { label: "Signed Docs Received", th: "ได้รับเอกสารลงนามจริงแล้ว", bg: "#F1EFFB", fg: "#6E62C9" },
  SUBMITTED: { label: "Submitted / Awaiting Payment", th: "ยื่นแล้ว รอจ่าย", bg: "#FEF6D8", fg: "#9A7B06" },
  PAID: { label: "Paid", th: "จ่ายแล้ว", bg: "#DFF5E6", fg: "#1E8E4F" },
  UNCLAIMED: { label: "Unclaimed", th: "ยังไม่ยื่น", bg: "#EDF0F2", fg: "#5B6672" },
};

/* กระบวนการจริง — การแก้สถานะในระบบไม่ใช่การลงนาม */
export const PAPER_FLOW = [
  { key: "prepare", label: "STAFF-1 จัดทำคำขอ" },
  { key: "instructorSign", label: "INST-A ตรวจ / ลงนามจริง" },
  { key: "authoritySign", label: "ผู้มีอำนาจลงนามจริง" },
  { key: "finance", label: "ส่งการเงิน" },
  { key: "paid", label: "จ่ายเงิน" },
];

const COURSES = [
  {
    id: "CS361-SP-1-2569",
    code: "CS361",
    name: "Cloud-Based Software Architecting",
    program: "ภาคพิเศษ",
    term: "1/2569",
    studyPeriod: "ส.ค.–พ.ย. 2569",
    status: "Scheduled",
    ownerSub: S.INST_A,
  },
  {
    id: "CS362-SP-1-2569",
    code: "CS362",
    name: "Software Testing (ข้อมูลของ INST-B)",
    program: "ภาคพิเศษ",
    term: "1/2569",
    studyPeriod: "ส.ค.–พ.ย. 2569",
    status: "Scheduled",
    ownerSub: S.INST_B,
  },
];

/* คาบสอนตามตาราง — 1 คาบอยู่ได้แค่ 1 คำขอ (ห้ามใช้คาบสอนซ้ำ) */
const SESSIONS = [
  { id: "S-0905", courseId: "CS361-SP-1-2569", round: "SEP-2569", date: "2026-09-05", hours: 3, claimId: "CLAIM-601" },
  { id: "S-0912", courseId: "CS361-SP-1-2569", round: "SEP-2569", date: "2026-09-12", hours: 3, claimId: "CLAIM-601" },
  { id: "S-0919", courseId: "CS361-SP-1-2569", round: "SEP-2569", date: "2026-09-19", hours: 3, claimId: "CLAIM-601" },
  { id: "S-1003", courseId: "CS361-SP-1-2569", round: "OCT-2569", date: "2026-10-03", hours: 3, claimId: "CLAIM-602" },
  { id: "S-1010", courseId: "CS361-SP-1-2569", round: "OCT-2569", date: "2026-10-10", hours: 3, claimId: "CLAIM-602" },
  { id: "S-1017", courseId: "CS361-SP-1-2569", round: "OCT-2569", date: "2026-10-17", hours: 3, claimId: "CLAIM-603" },
  { id: "S-1024", courseId: "CS361-SP-1-2569", round: "OCT-2569", date: "2026-10-24", hours: 3, claimId: null },
  { id: "S-B-1007", courseId: "CS362-SP-1-2569", round: "OCT-2569", date: "2026-10-07", hours: 3, claimId: "CLAIM-701" },
];

const PAPER_EVIDENCE_601 = {
  id: "EV-601-PAPER",
  title: "แบบขอเบิก CLAIM-601 ลงนามจริง (สแกนจำลอง)",
  signedBy: "INST-A",
  signedByAuthority: "ผู้มีอำนาจลงนาม (จำลอง)",
  receivedBy: "STAFF-1",
  receivedAt: "2026-10-02T10:30:00+07:00",
  note: "เอกสารจำลองสำหรับทดสอบ — ไม่ใช่ลายเซ็นของบุคคลจริง",
};

const CLAIMS = [
  {
    id: "CLAIM-601",
    courseId: "CS361-SP-1-2569",
    ownerSub: S.INST_A,
    round: "SEP-2569",
    status: CLAIM_STATUS.SIGNED_DOCS_RECEIVED,
    flowDone: ["prepare", "instructorSign", "authoritySign"],
    payment: null,
    evidence: PAPER_EVIDENCE_601,
  },
  {
    id: "CLAIM-602",
    courseId: "CS361-SP-1-2569",
    ownerSub: S.INST_A,
    round: "OCT-2569",
    status: CLAIM_STATUS.PAID,
    flowDone: ["prepare", "instructorSign", "authoritySign", "finance", "paid"],
    payment: {
      paidAt: "2026-10-15",
      reference: "PAY-2569-10-0602",
      bankName: "BANK-A",
      accountMasked: "xxx-x-x1234-x",
    },
    evidence: { ...PAPER_EVIDENCE_601, id: "EV-602-PAPER", title: "แบบขอเบิก CLAIM-602 ลงนามจริง (สแกนจำลอง)" },
  },
  {
    id: "CLAIM-603",
    courseId: "CS361-SP-1-2569",
    ownerSub: S.INST_A,
    round: "OCT-2569",
    status: CLAIM_STATUS.SUBMITTED,
    flowDone: ["prepare", "instructorSign", "authoritySign", "finance"],
    payment: null,
    evidence: { ...PAPER_EVIDENCE_601, id: "EV-603-PAPER", title: "แบบขอเบิก CLAIM-603 ลงนามจริง (สแกนจำลอง)" },
  },
  {
    id: "CLAIM-701",
    courseId: "CS362-SP-1-2569",
    ownerSub: S.INST_B,
    round: "OCT-2569",
    status: CLAIM_STATUS.PAID,
    flowDone: ["prepare", "instructorSign", "authoritySign", "finance", "paid"],
    payment: {
      paidAt: "2026-10-16",
      reference: "PAY-2569-10-0701",
      bankName: "BANK-B",
      accountMasked: "xxx-x-x5678-x",
    },
    evidence: null,
  },
];

/* นักศึกษาช่วยงาน: กรอก 8 / รับรอง 6 / รอตรวจ 2 — ส่วนนี้เปลี่ยนได้ระหว่างทดสอบ */
const BASELINE_ASSISTANT = [
  {
    id: "TA-CS361-STU-A",
    courseId: "CS361-SP-1-2569",
    studentSub: S.STU_A,
    instructorSub: S.INST_A,
    studentConfirmedAt: "2026-10-26T09:00:00+07:00",
    entries: [
      { id: "E1", date: "2026-10-03", hours: 2, task: "ช่วยตรวจ Lab AWS IAM", status: "VERIFIED" },
      { id: "E2", date: "2026-10-10", hours: 2, task: "ช่วยตอบคำถาม Lab Lambda", status: "VERIFIED" },
      { id: "E3", date: "2026-10-17", hours: 2, task: "ช่วยเตรียมชุดทดสอบ API Gateway", status: "VERIFIED" },
      { id: "E4", date: "2026-10-24", hours: 2, task: "ช่วยคุมสอบย่อย", status: "PENDING" },
    ],
    // ขั้นตอนเอกสาร: ระบบรับรอง ≠ ลายเซ็นจริง
    docIssuedAt: null,
    signedEvidence: null,
    history: [
      { at: "2026-10-26T09:00:00+07:00", actor: "STU-A", text: "ยืนยันชั่วโมงที่กรอก 8 ชม." },
      { at: "2026-10-27T13:00:00+07:00", actor: "INST-A", text: "รับรองในระบบ 6 ชม. (E1–E3) — E4 รอตรวจ" },
    ],
  },
];

const STORAGE_KEY = "teaching-claim-system:finance-mock:v1";

const clone = (value) => JSON.parse(JSON.stringify(value));

function loadAssistant() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : clone(BASELINE_ASSISTANT);
  } catch {
    return clone(BASELINE_ASSISTANT);
  }
}

function saveAssistant(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* เก็บไม่ได้ → รีเฟรชแล้วกลับ baseline */
  }
}

function error(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const delay = () => new Promise((resolve) => setTimeout(resolve, 200));

export const getAccountBySub = (sub) =>
  FINANCE_ACCOUNTS.find((a) => a.sub === sub) || null;

const codeOf = (sub) => getAccountBySub(sub)?.code || "-";

export function sumHours(items) {
  return items.reduce((total, item) => total + Number(item.hours || 0), 0);
}

/*
 * สรุปชั่วโมงรายรอบ: 1 คาบนับได้ที่เดียวตามสถานะคำขอของคาบนั้น
 * → scheduled = paid + submitted + signed + unclaimed เสมอ (ไม่นับซ้ำ)
 */
export function summarizeRound(sessions, claims) {
  const statusOf = (s) =>
    s.claimId
      ? claims.find((c) => c.id === s.claimId)?.status || CLAIM_STATUS.UNCLAIMED
      : CLAIM_STATUS.UNCLAIMED;

  const by = (status) => sumHours(sessions.filter((s) => statusOf(s) === status));

  return {
    scheduled: sumHours(sessions),
    paid: by(CLAIM_STATUS.PAID),
    submitted: by(CLAIM_STATUS.SUBMITTED),
    signed: by(CLAIM_STATUS.SIGNED_DOCS_RECEIVED),
    unclaimed: by(CLAIM_STATUS.UNCLAIMED),
  };
}

export function summarizeAssistant(record) {
  const entries = record?.entries || [];

  return {
    entered: sumHours(entries),
    verified: sumHours(entries.filter((e) => e.status === "VERIFIED")),
    pending: sumHours(entries.filter((e) => e.status === "PENDING")),
  };
}

/*
 * จำลอง GET /api/finance/me — backend กรองตาม sub ของ token เท่านั้น
 *  - อาจารย์: รายวิชา/คาบ/คำขอ/บัญชีของตนเอง + งานช่วยสอนในวิชาที่ตนเป็นเจ้าของ
 *  - นักศึกษาช่วยงาน: งานช่วยสอนของตนเอง
 *  - เจ้าหน้าที่: คำขอทุกรายการ + หลักฐาน (บัญชีปกปิด) เพื่อจัดทำ/รับเอกสาร
 */
export async function fetchFinanceForUser(user) {
  await delay();

  const sub = user?.cognitoSub;
  const account = getAccountBySub(sub);

  if (!account) {
    return { account: null, sub };
  }

  const isStaff = account.group === "STAFF";
  const assistant = loadAssistant();

  const courses = COURSES.filter((c) => isStaff || c.ownerSub === sub);
  const courseIds = new Set(courses.map((c) => c.id));

  const claims = CLAIMS.filter((c) => isStaff || c.ownerSub === sub).map((c) => ({
    ...c,
    ownerCode: codeOf(c.ownerSub),
    // บัญชีปลายทางส่งเฉพาะให้เจ้าของคำขอหรือเจ้าหน้าที่ (และปกปิดเสมอ)
    payment: c.payment && (isStaff || c.ownerSub === sub) ? c.payment : null,
  }));

  const sessions = SESSIONS.filter((s) => courseIds.has(s.courseId));

  const assistantRecords = assistant
    .filter(
      (r) => isStaff || r.studentSub === sub || r.instructorSub === sub,
    )
    .map((r) => ({
      ...r,
      studentCode: codeOf(r.studentSub),
      instructorCode: codeOf(r.instructorSub),
      course: COURSES.find((c) => c.id === r.courseId),
      courseOwnerCode: codeOf(COURSES.find((c) => c.id === r.courseId)?.ownerSub),
    }));

  return clone({
    sub,
    account: {
      code: account.code,
      name: account.name,
      group: account.group,
      bank: account.bank,
    },
    courses: courses.map((c) => ({ ...c, ownerCode: codeOf(c.ownerSub) })),
    sessions,
    claims,
    assistantRecords,
  });
}

/*
 * จำลองการเปลี่ยนสถานะงานช่วยสอน — ตรวจ role + document state แบบที่ backend ต้องทำ
 * action: confirm (STU-A) | verify / reject (อาจารย์เจ้าของวิชา) | issueDoc (อาจารย์) | receiveEvidence (STAFF)
 */
export async function updateAssistantRecord(user, recordId, action, payload = {}) {
  await delay();

  const account = getAccountBySub(user?.cognitoSub);
  if (!account) throw error(403, "ไม่พบบัญชีที่ผูกกับ Cognito sub นี้");

  const records = loadAssistant();
  const record = records.find((r) => r.id === recordId);
  if (!record) throw error(404, "ไม่พบรายการช่วยงาน");

  const at = new Date().toISOString();
  const log = (text) => record.history.push({ at, actor: account.code, text });

  switch (action) {
    case "confirm": {
      if (record.studentSub !== account.sub)
        throw error(403, "ยืนยันได้เฉพาะนักศึกษาเจ้าของรายการ");
      record.studentConfirmedAt = at;
      log(`ยืนยันชั่วโมงที่กรอก ${sumHours(record.entries)} ชม.`);
      break;
    }

    case "verify":
    case "reject": {
      if (record.instructorSub !== account.sub)
        throw error(403, "รับรองได้เฉพาะอาจารย์เจ้าของรายวิชา");
      if (!record.studentConfirmedAt)
        throw error(409, "นักศึกษายังไม่ยืนยันชั่วโมง");
      if (record.signedEvidence)
        throw error(409, "รับหลักฐานลงนามแล้ว แก้ชั่วโมงไม่ได้");

      const entry = record.entries.find((e) => e.id === payload.entryId);
      if (!entry || entry.status !== "PENDING")
        throw error(409, "รายการนี้ไม่ได้อยู่ในสถานะรอตรวจ");

      entry.status = action === "verify" ? "VERIFIED" : "REJECTED";
      log(`${action === "verify" ? "รับรอง" : "ไม่รับรอง"}ในระบบ ${entry.id} (${entry.hours} ชม.)`);
      break;
    }

    case "issueDoc": {
      if (record.instructorSub !== account.sub)
        throw error(403, "ออกเอกสารได้เฉพาะอาจารย์เจ้าของรายวิชา");
      record.docIssuedAt = at;
      log(`ออกเอกสารรับรอง ${summarizeAssistant(record).verified} ชม. เพื่อลงนามจริงบนกระดาษ`);
      break;
    }

    case "receiveEvidence": {
      if (account.group !== "STAFF")
        throw error(403, "บันทึกรับหลักฐานได้เฉพาะเจ้าหน้าที่");
      if (!record.docIssuedAt)
        throw error(409, "ยังไม่ได้ออกเอกสารให้อาจารย์ลงนาม");

      record.signedEvidence = {
        id: `EV-${record.id}`,
        title: "ใบรับรองชั่วโมงนักศึกษาช่วยงาน ลงนามจริง (สแกนจำลอง)",
        signedBy: codeOf(record.instructorSub),
        verifiedHours: summarizeAssistant(record).verified,
        receivedBy: account.code,
        receivedAt: at,
        note: "หลักฐานลายเซ็นจำลองเท่านั้น — การกดรับรองในระบบไม่ใช่ลายเซ็น",
      };
      log("บันทึกการรับหลักฐานลงนามจริง (จำลอง)");
      break;
    }

    default:
      throw error(400, "ไม่รู้จัก action");
  }

  saveAssistant(records);
  return clone(record);
}

// คืนค่า baseline ตามเอกสาร Setup (ไม่แตะข้อมูลบุคคลจริง)
export function resetFinanceMock() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ไม่เป็นไร */
  }
}
