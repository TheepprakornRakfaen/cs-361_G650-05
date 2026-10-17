/*
 * [V3] สถานะคำขอและขั้นตอน workflow (ฝั่ง UI)
 *
 * ไฟล์นี้เดิมว่างเปล่า (0 ไบต์) ทำให้ build ไม่ผ่าน — เติมให้ครบตาม export ที่ไฟล์อื่น import อยู่
 * สิทธิ์ของแต่ละบทบาทอยู่ใน data/roles.js ที่นี่ใช้ตัดสินแค่ "ขั้นตอนถัดไปของสถานะนี้"
 *
 * ⚠️ UI ซ่อนปุ่มเพื่อความสะดวกเท่านั้น backend ต้องตรวจสิทธิ์และลำดับสถานะทุกครั้ง
 */
import { PERMISSION as P, can } from "./roles";

export const STATUS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted", // ยื่นแล้ว รอผู้ตรวจสอบ
  REVIEWED: "Reviewed", // ผู้ตรวจสอบผ่านแล้ว รอผู้อนุมัติ
  APPROVED: "Approved",
  // ไม่อนุมัติ — ผู้อนุมัติปฏิเสธคำขอ (สิ้นสุดการพิจารณา ผู้ยื่นแก้ไข/ยื่นซ้ำไม่ได้)
  REJECTED: "Rejected",
  RETURNED: "Returned", // ส่งคืนให้ผู้ยื่นแก้ไข
  UNKNOWN: "Unknown",
};

/*
 * รหัสตัวเลขที่ backend ใช้ (migration 011):
 * 0 = แบบร่าง, 1 = รอตรวจ, 2 = ตรวจแล้วรออนุมัติ
 * 3 = อนุมัติ, 4 = ไม่อนุมัติ, 5 = ส่งคืนแก้ไข
 * รหัสที่ไม่รู้จักจะเป็น Unknown
 */
const NUMERIC_STATUS = {
  0: STATUS.DRAFT,
  1: STATUS.SUBMITTED,
  2: STATUS.REVIEWED,
  3: STATUS.APPROVED,
  4: STATUS.REJECTED,
  5: STATUS.RETURNED,
};

// ชื่อสถานะแบบข้อความอื่นๆ ที่ backend อาจส่งมา
const STRING_STATUS = {
  PENDING: STATUS.SUBMITTED,
  UNDER_REVIEW: STATUS.SUBMITTED,
  IN_REVIEW: STATUS.SUBMITTED,
  VERIFIED: STATUS.REVIEWED,
  REVIEW_PASSED: STATUS.REVIEWED,
  PENDING_APPROVAL: STATUS.REVIEWED,
  REVISION_REQUESTED: STATUS.RETURNED,
  NEEDS_REVISION: STATUS.RETURNED,
};

export function normalizeStatus(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return STATUS.DRAFT;
  }

  if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
    return NUMERIC_STATUS[Number(raw)] || STATUS.UNKNOWN;
  }

  const key = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return (
    Object.values(STATUS).find((value) => value.toUpperCase() === key) ||
    STRING_STATUS[key] ||
    STATUS.UNKNOWN
  );
}

// คิวของผู้ตรวจสอบ/อนุมัติ — แบบร่างของผู้อื่นไม่เกี่ยวข้อง
export const QUEUE_STATUSES = [
  STATUS.SUBMITTED,
  STATUS.REVIEWED,
  STATUS.RETURNED,
  STATUS.APPROVED,
  STATUS.REJECTED,
];

// อยู่ระหว่างพิจารณา (รอตรวจ / รออนุมัติ) — ใช้นับวันรอ (SLA) และยอดเงินที่รอ
export const PENDING_STATUSES = [STATUS.SUBMITTED, STATUS.REVIEWED];

export const isPending = (status) => PENDING_STATUSES.includes(status);

// ผู้ยื่นแก้ไขและยื่นใหม่ได้
export const EDITABLE_STATUSES = [STATUS.DRAFT, STATUS.RETURNED];

// ลบได้เฉพาะแบบร่าง (ลบคำขอที่เข้า workflow แล้วจะทำให้ประวัติหาย)
export const DELETABLE_STATUSES = [STATUS.DRAFT];

// ผู้ยื่นแนบไฟล์เพิ่มได้ในสถานะเหล่านี้ (หลังตรวจสอบผ่านแล้วห้ามเปลี่ยนเอกสาร)
export const ATTACHABLE_STATUSES = [STATUS.SUBMITTED, STATUS.RETURNED];

export function isOwnClaim(claim, user) {
  return Boolean(
    claim?.ownerSub && user?.cognitoSub && claim.ownerSub === user.cognitoSub,
  );
}

/* =========================
 * Stepper: ยื่นคำขอ → ตรวจสอบ → อนุมัติ
 * state: done | current | warning | error | pending
 * ========================= */
// ผ่านการตรวจสอบแล้ว (ผู้ตรวจสอบกด /pass) → สถานะ 2 รออนุมัติ
export const isReviewed = (claim) => claim?.status === STATUS.REVIEWED;

export function getWorkflowSteps(status) {
  const step = (key, label, state) => ({ key, label, state });

  switch (status) {
    case STATUS.SUBMITTED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "รอตรวจสอบ", "current"),
        step("approve", "อนุมัติ", "pending"),
      ];
    case STATUS.REVIEWED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบแล้ว", "done"),
        step("approve", "รออนุมัติ", "current"),
      ];
    case STATUS.APPROVED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบแล้ว", "done"),
        step("approve", "อนุมัติแล้ว", "done"),
      ];
    case STATUS.REJECTED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบ", "done"),
        step("approve", "ไม่อนุมัติ", "error"),
      ];
    case STATUS.RETURNED:
      return [
        step("submit", "ส่งกลับแก้ไข", "warning"),
        step("review", "ตรวจสอบ", "pending"),
        step("approve", "อนุมัติ", "pending"),
      ];
    default:
      return [
        step("submit", "ยื่นคำขอ", "pending"),
        step("review", "ตรวจสอบ", "pending"),
        step("approve", "อนุมัติ", "pending"),
      ];
  }
}

/* =========================
 * Actions ของผู้ตรวจสอบ / ผู้อนุมัติ
 * key → path ที่ส่งไป POST /api/claims/{id}/{path} (ดู ACTION_PATH ใน services/api.js)
 * ========================= */
const ACTION = {
  // ผู้ตรวจสอบ: ตรวจเอกสารครบถ้วนแล้วส่งต่อผู้อนุมัติ → สถานะ 2
  REVIEW_PASS: {
    key: "REVIEW_PASS",
    label: "ตรวจสอบแล้ว · ส่งต่อผู้อนุมัติ",
    tone: "teal",
    requireComment: false,
    confirmTitle: "ยืนยันการตรวจสอบ",
    confirmText:
      "ยืนยันว่าตรวจสอบความครบถ้วน ความถูกต้อง สิทธิ์ และเอกสารประกอบแล้ว คำขอจะถูกส่งต่อให้ผู้อนุมัติพิจารณา",
    commentLabel: "หมายเหตุถึงผู้อนุมัติ (ไม่บังคับ)",
    confirmButton: "ยืนยันส่งต่อ",
  },
  // อนุมัติ → คำขอไปอยู่ในกลุ่ม "อนุมัติแล้ว" ทันที
  APPROVE: {
    key: "APPROVE",
    label: "อนุมัติ",
    tone: "green",
    requireComment: false,
    confirmTitle: "ยืนยันการอนุมัติ",
    confirmText: "เมื่อยืนยัน คำขอจะถูกอนุมัติทันที และแก้ไขสถานะไม่ได้อีก",
    commentLabel: "หมายเหตุ (ไม่บังคับ)",
    confirmButton: "ยืนยันอนุมัติ",
  },
  // ไม่อนุมัติ: เฉพาะผู้อนุมัติ (claim.approve) · บังคับระบุเหตุผล · สิ้นสุดการพิจารณา
  REJECT: {
    key: "REJECT",
    label: "ไม่อนุมัติ",
    tone: "red",
    requireComment: true,
    confirmTitle: "ยืนยันการไม่อนุมัติ",
    confirmText:
      "คำขอจะสิ้นสุดการพิจารณา ผู้ยื่นจะแก้ไขหรือยื่นซ้ำไม่ได้ ระบบเก็บประวัติและเหตุผลไว้ให้ตรวจสอบย้อนหลัง",
    commentLabel: "เหตุผลที่ไม่อนุมัติ",
    confirmButton: "ยืนยันไม่อนุมัติ",
  },
  RETURN: {
    key: "RETURN",
    label: "ส่งกลับแก้ไข",
    tone: "amber",
    requireComment: true,
    confirmTitle: "ส่งกลับให้ผู้ยื่นแก้ไข",
    confirmText: "ผู้ยื่นจะแก้ไขและยื่นใหม่ได้ ระบบเก็บประวัติเดิมไว้ทั้งหมด",
    commentLabel: "สิ่งที่ต้องแก้ไข",
    confirmButton: "ยืนยันส่งกลับ",
  },
};

/*
 * ลำดับขั้น:
 *   1 รอตรวจ          → ผู้ตรวจสอบ: ส่งต่อ (/pass → 2) หรือ ส่งคืนแก้ไข (/return → 5)
 *   2 ตรวจแล้วรออนุมัติ → ผู้อนุมัติ: อนุมัติ (→ 3) / ไม่อนุมัติ (→ 4) / ส่งคืนแก้ไข (→ 5)
 * ห้ามจัดการคำขอของตัวเอง
 * คืน { actions, blockedReason } — blockedReason ใช้แสดงแทนปุ่มเมื่อติดเงื่อนไข
 */

export function getAllowedActions(claim, user) {
  const none = { actions: [], blockedReason: "" };

  if (
    !claim ||
    (claim.status !== STATUS.SUBMITTED && claim.status !== STATUS.REVIEWED)
  ) {
    return none;
  }

  const canReview = can(user, P.CLAIM_REVIEW);
  const canApprove = can(user, P.CLAIM_APPROVE);

  if (!canReview && !canApprove) {
    // ดูคำขอของผู้อื่นได้แต่ไม่มีสิทธิ์ตัดสิน (เช่น ผู้ดูแลระบบ) → บอกชัดว่าทำไมไม่มีปุ่ม
    return can(user, P.CLAIM_VIEW_ALL)
      ? {
          actions: [],
          blockedReason:
            "บทบาทของคุณดูข้อมูลได้อย่างเดียว ไม่มีสิทธิ์ตรวจสอบหรืออนุมัติคำขอ",
        }
      : none;
  }

  if (isOwnClaim(claim, user)) {
    return {
      actions: [],
      blockedReason:
        "คุณเป็นเจ้าของคำขอนี้ จึงไม่สามารถตรวจสอบหรืออนุมัติคำขอของตัวเองได้",
    };
  }

  // ขั้นที่ 1 รอตรวจ: เฉพาะผู้ตรวจสอบ (ไม่มีสิทธิ์อนุมัติ) — /pass, /return
  if (claim.status === STATUS.SUBMITTED) {
    if (canReview && !canApprove) {
      return {
        actions: [ACTION.REVIEW_PASS, ACTION.RETURN],
        blockedReason: "",
      };
    }

    return {
      actions: [],
      blockedReason:
        "คำขอนี้ยังรอเจ้าหน้าที่ตรวจสอบและส่งต่อ ผู้อนุมัติพิจารณาได้หลังผ่านการตรวจสอบแล้ว",
    };
  }

  // ขั้นที่ 2 ตรวจแล้วรออนุมัติ: เฉพาะผู้อนุมัติ — /return, /reject, /approve
  if (canApprove) {
    return {
      actions: [ACTION.RETURN, ACTION.REJECT, ACTION.APPROVE],
      blockedReason: "",
    };
  }

  return {
    actions: [],
    blockedReason: "คำขอนี้ผ่านการตรวจสอบแล้ว รอผู้อนุมัติพิจารณา",
  };
}

/* =========================
 * Audit log
 * tone: neutral | teal | green | red | amber (ตรงกับ TONE ใน AuditTimeline)
 * ========================= */
export const AUDIT_ACTION_META = {
  CREATE: { label: "สร้างคำขอ", tone: "neutral" },
  UPDATE: { label: "แก้ไขคำขอ", tone: "neutral" },
  SUBMIT: { label: "ยื่นคำขอ", tone: "teal" },
  RESUBMIT: { label: "ยื่นคำขอใหม่หลังแก้ไข", tone: "teal" },
  REVIEW_PASS: { label: "ตรวจสอบผ่าน ส่งต่อผู้อนุมัติ", tone: "teal" },
  APPROVE: { label: "อนุมัติ", tone: "green" },
  REJECT: { label: "ไม่อนุมัติ", tone: "red" },
  RETURN: { label: "ส่งกลับแก้ไข", tone: "amber" },
  EVIDENCE_UPLOAD: { label: "แนบเอกสารประกอบ", tone: "neutral" },
  EVIDENCE_VIEW: { label: "เปิดดูเอกสารประกอบ", tone: "neutral" },
  CANCEL: { label: "ยกเลิกคำขอ", tone: "neutral" },
};

// backend อาจส่งชื่อเหตุการณ์เป็นรูปอดีต/ชื่ออื่น → รวมให้เป็นกุญแจเดียว
const AUDIT_ALIAS = {
  CREATED: "CREATE",
  UPDATED: "UPDATE",
  SUBMITTED: "SUBMIT",
  RESUBMITTED: "RESUBMIT",
  REVIEWED: "REVIEW_PASS",
  FORWARD: "REVIEW_PASS",
  FORWARDED: "REVIEW_PASS",
  APPROVED: "APPROVE",
  REJECTED: "REJECT",
  RETURNED: "RETURN",
  EVIDENCE_ADDED: "EVIDENCE_UPLOAD",
  EVIDENCE_REGISTERED: "EVIDENCE_UPLOAD",
  EVIDENCE_VIEWED: "EVIDENCE_VIEW",
  CANCELLED: "CANCEL",
  CANCELED: "CANCEL",
};

export function getAuditMeta(action) {
  const raw = String(action || "").trim();
  const key = raw.toUpperCase().replace(/[\s-]+/g, "_");

  return (
    AUDIT_ACTION_META[AUDIT_ALIAS[key] || key] || {
      label: raw || "ไม่ระบุเหตุการณ์",
      tone: "neutral",
    }
  );
}