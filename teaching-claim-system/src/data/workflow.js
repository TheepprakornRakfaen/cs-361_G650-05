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
  SUBMITTED: "Submitted", // ยื่นแล้ว รอตรวจสอบ (ตรวจสอบเสร็จแล้วอนุมัติ → Approved ทันที ไม่มีขั้น "รออนุมัติ" แยก)
  RETURNED: "Returned", // ส่งกลับให้ผู้ยื่นแก้ไข
  APPROVED: "Approved",
  // ไม่อนุมัติ — ตามขั้นตอนจริงไม่มีการปฏิเสธ มีแค่ "ส่งกลับแก้ไข"
  // เก็บไว้เพื่อแสดงคำขอเก่าที่อาจมีสถานะนี้อยู่แล้วเท่านั้น ห้ามมีปุ่ม/ตัวกรองให้เลือก
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  UNKNOWN: "Unknown",
};

/*
 * รหัสตัวเลขที่ backend ใช้อยู่: 0 แบบร่าง, 1 ยื่นแล้ว, 2 ยกเลิก
 * TODO(V3): เติมรหัสของ Reviewed / Approved / Rejected / Returned ให้ตรงกับ schema (#2)
 * รหัสที่ไม่รู้จักจะเป็น Unknown (แสดง "ไม่ทราบสถานะ") ไม่ถูกมองเป็นแบบร่างแบบเงียบ ๆ
 */
const NUMERIC_STATUS = {
  0: STATUS.DRAFT,
  1: STATUS.SUBMITTED,
  2: STATUS.CANCELLED,
};

/*
 * ไม่มีสถานะ "ตรวจสอบแล้ว / รออนุมัติ" แยกอีกต่อไป — การตรวจสอบกับการอนุมัติเป็นการกระทำเดียว
 * ถ้า backend ยังส่งค่าเก่า (REVIEWED / VERIFIED ฯลฯ) มา ให้ถือเป็น "รอตรวจสอบ"
 * เพื่อให้คำขอเก่าไม่ตกหล่นและยังอนุมัติได้
 */
const STRING_STATUS = {
  PENDING: STATUS.SUBMITTED,
  UNDER_REVIEW: STATUS.SUBMITTED,
  IN_REVIEW: STATUS.SUBMITTED,
  REVIEWED: STATUS.SUBMITTED,
  VERIFIED: STATUS.SUBMITTED,
  REVIEW_PASSED: STATUS.SUBMITTED,
  PENDING_APPROVAL: STATUS.SUBMITTED,
  REVISION_REQUESTED: STATUS.RETURNED,
  NEEDS_REVISION: STATUS.RETURNED,
  CANCELED: STATUS.CANCELLED,
};

export function normalizeStatus(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return STATUS.DRAFT;
  }

  if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
    return NUMERIC_STATUS[Number(raw)] || STATUS.UNKNOWN;
  }

  const key = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");

  return (
    Object.values(STATUS).find((value) => value.toUpperCase() === key) ||
    STRING_STATUS[key] ||
    STATUS.UNKNOWN
  );
}

// คิวของผู้ตรวจสอบ/อนุมัติ — แบบร่างของผู้อื่นไม่เกี่ยวข้อง
export const QUEUE_STATUSES = [
  STATUS.SUBMITTED,
  STATUS.RETURNED,
  STATUS.APPROVED,
  STATUS.REJECTED, // คำขอเก่าเท่านั้น (ยังให้เห็นใน "ทั้งหมด") — ไม่มีการ์ด/ตัวกรองแยก
];

// ผู้ยื่นแก้ไขและยื่นใหม่ได้
export const EDITABLE_STATUSES = [STATUS.DRAFT, STATUS.RETURNED];

// ลบได้เฉพาะแบบร่าง (ลบคำขอที่เข้า workflow แล้วจะทำให้ประวัติหาย)
export const DELETABLE_STATUSES = [STATUS.DRAFT];

// ผู้ยื่นแนบไฟล์เพิ่มได้ในสถานะเหล่านี้ (หลังตรวจสอบผ่านแล้วห้ามเปลี่ยนเอกสาร)
export const ATTACHABLE_STATUSES = [STATUS.SUBMITTED, STATUS.RETURNED];

export function isOwnClaim(claim, user) {
  return Boolean(
    claim?.ownerSub &&
      user?.cognitoSub &&
      claim.ownerSub === user.cognitoSub
  );
}

/* =========================
 * Stepper: ยื่นคำขอ → ตรวจสอบ → อนุมัติ
 * state: done | current | warning | error | pending
 * ========================= */
export function getWorkflowSteps(status) {
  const step = (key, label, state) => ({ key, label, state });

  switch (status) {
    case STATUS.SUBMITTED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "รอตรวจสอบ", "current"),
        step("approve", "อนุมัติ", "pending"),
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
 * key ตรงกับค่า action ที่ส่งไป POST /api/claims/{id}/actions
 * ========================= */
const ACTION = {
  // ตรวจสอบเสร็จแล้วอนุมัติในขั้นตอนเดียว → คำขอไปอยู่ในกลุ่ม "อนุมัติแล้ว" ทันที
  APPROVE: {
    key: "APPROVE",
    label: "ตรวจสอบแล้ว · อนุมัติ",
    tone: "green",
    requireComment: false,
    confirmTitle: "ยืนยันการตรวจสอบและอนุมัติ",
    confirmText:
      "เมื่อยืนยัน คำขอจะถูกอนุมัติทันที และแก้ไขสถานะไม่ได้อีก",
    commentLabel: "หมายเหตุ (ไม่บังคับ)",
    confirmButton: "ยืนยันอนุมัติ",
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
 * คำขอที่ "รอตรวจสอบ" (Submitted) ผู้มีสิทธิ์ตรวจสอบ/อนุมัติทำได้ 2 อย่าง:
 *   ตรวจสอบแล้วอนุมัติ / ส่งกลับแก้ไข
 * ไม่มี "ไม่อนุมัติ" — เจ้าหน้าที่ยืนยันว่าไม่มีการปฏิเสธ มีแค่ส่งกลับให้แก้ (เซ็นขาด/เกิน/เซ็นวันหยุด ฯลฯ)
 * ห้ามจัดการคำขอของตัวเอง
 * คืน { actions, blockedReason } — blockedReason ใช้แสดงแทนปุ่มเมื่อติดเงื่อนไข
 */
export function getAllowedActions(claim, user) {
  const none = { actions: [], blockedReason: "" };

  if (!claim || claim.status !== STATUS.SUBMITTED) return none;

  if (!(can(user, P.CLAIM_REVIEW) || can(user, P.CLAIM_APPROVE))) {
    return none;
  }

  if (isOwnClaim(claim, user)) {
    return {
      actions: [],
      blockedReason:
        "คุณเป็นเจ้าของคำขอนี้ จึงไม่สามารถตรวจสอบหรืออนุมัติคำขอของตัวเองได้",
    };
  }

  return {
    actions: [ACTION.APPROVE, ACTION.RETURN],
    blockedReason: "",
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