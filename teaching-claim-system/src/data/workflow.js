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
  // หลังอนุมัติ: เจ้าหน้าที่ได้รับเอกสารที่ลงนามจริงบนกระดาษแล้ว รอส่งการเงิน
  SIGNED_DOCS: "SignedDocs",
  PAID: "Paid", // การเงินจ่ายเงินแล้ว (สิ้นสุด)
  UNKNOWN: "Unknown",
};

/*
 * รหัสตัวเลขที่ backend ใช้ (migration 010):
 * 0 = แบบร่าง, 1 = รอตรวจ, 2 = ตรวจแล้วรออนุมัติ
 * 3 = อนุมัติ, 4 = ไม่อนุมัติ, 5 = ส่งคืนแก้ไข
 * 6 = ได้รับเอกสารลงนามแล้ว, 7 = จ่ายแล้ว (⚠️ backend ต้องเพิ่มรหัส 6, 7)
 * รหัสที่ไม่รู้จักจะเป็น Unknown
 */
const NUMERIC_STATUS = {
  0: STATUS.DRAFT,
  1: STATUS.SUBMITTED,
  2: STATUS.REVIEWED,
  3: STATUS.APPROVED,
  4: STATUS.REJECTED,
  5: STATUS.RETURNED,
  6: STATUS.SIGNED_DOCS,
  7: STATUS.PAID,
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
  SIGNED_DOCS_RECEIVED: STATUS.SIGNED_DOCS,
  SIGNED_DOCS: STATUS.SIGNED_DOCS,
  SIGNED: STATUS.SIGNED_DOCS,
  AWAITING_PAYMENT: STATUS.SIGNED_DOCS,
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
  STATUS.SIGNED_DOCS,
  STATUS.PAID,
  STATUS.REJECTED,
];

// อนุมัติแล้ว (รวมขั้นหลังอนุมัติ) — ใช้นับยอดอนุมัติ/ยอดเงิน
export const APPROVED_STATUSES = [
  STATUS.APPROVED,
  STATUS.SIGNED_DOCS,
  STATUS.PAID,
];

export const isApprovedOrLater = (status) =>
  APPROVED_STATUSES.includes(status);

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

  // ขั้นหลังอนุมัติ: ลงนามเอกสารจริง → จ่ายเงิน
  const afterApprove = (signed, paid) => [
    step(
      "sign",
      signed === "done" ? "ได้รับเอกสารลงนาม" : "รอเอกสารลงนาม",
      signed
    ),
    step("pay", paid === "done" ? "จ่ายแล้ว" : "จ่ายเงิน", paid),
  ];

  switch (status) {
    case STATUS.SUBMITTED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "รอตรวจสอบ", "current"),
        step("approve", "อนุมัติ", "pending"),
        ...afterApprove("pending", "pending"),
      ];
    case STATUS.REVIEWED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบแล้ว", "done"),
        step("approve", "รออนุมัติ", "current"),
        ...afterApprove("pending", "pending"),
      ];
    case STATUS.APPROVED:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบแล้ว", "done"),
        step("approve", "อนุมัติแล้ว", "done"),
        ...afterApprove("current", "pending"),
      ];
    case STATUS.SIGNED_DOCS:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบแล้ว", "done"),
        step("approve", "อนุมัติแล้ว", "done"),
        ...afterApprove("done", "current"),
      ];
    case STATUS.PAID:
      return [
        step("submit", "ยื่นคำขอแล้ว", "done"),
        step("review", "ตรวจสอบแล้ว", "done"),
        step("approve", "อนุมัติแล้ว", "done"),
        ...afterApprove("done", "done"),
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
        ...afterApprove("pending", "pending"),
      ];
    default:
      return [
        step("submit", "ยื่นคำขอ", "pending"),
        step("review", "ตรวจสอบ", "pending"),
        step("approve", "อนุมัติ", "pending"),
        ...afterApprove("pending", "pending"),
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
  // หลังอนุมัติ: เจ้าหน้าที่บันทึกว่าได้รับเอกสารที่ลงนามจริงบนกระดาษแล้ว → สถานะ 6
  RECORD_SIGNED_DOCS: {
    key: "RECORD_SIGNED_DOCS",
    label: "บันทึกรับเอกสารลงนามแล้ว",
    tone: "teal",
    requireComment: true,
    confirmTitle: "บันทึกการรับเอกสารลงนาม",
    confirmText:
      "ยืนยันว่าได้รับแบบฟอร์มที่ผู้ยื่นและผู้มีอำนาจลงนามจริงบนกระดาษครบแล้ว (การกดในระบบไม่ถือเป็นการลงนาม)",
    commentLabel: "เลขที่เอกสาร / วันที่รับ / หมายเหตุ",
    confirmButton: "ยืนยันรับเอกสาร",
  },
  // การเงินจ่ายเงินแล้ว → สถานะ 7
  MARK_PAID: {
    key: "MARK_PAID",
    label: "บันทึกจ่ายเงินแล้ว",
    tone: "green",
    requireComment: false,
    confirmTitle: "บันทึกการจ่ายเงิน",
    confirmText:
      "ยืนยันว่าการเงินโอนเงินให้ผู้ยื่นแล้ว เมื่อยืนยันคำขอจะสิ้นสุดและแก้ไขสถานะไม่ได้อีก",
    commentLabel: "เลขที่อ้างอิงการโอน / หมายเหตุ (ไม่บังคับ)",
    confirmButton: "ยืนยันจ่ายแล้ว",
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

  const afterApproval =
    claim?.status === STATUS.APPROVED || claim?.status === STATUS.SIGNED_DOCS;

  if (
    !claim ||
    (claim.status !== STATUS.SUBMITTED &&
      claim.status !== STATUS.REVIEWED &&
      !afterApproval)
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

  /*
   * หลังอนุมัติ: เจ้าหน้าที่ (ผู้มีสิทธิ์ตรวจสอบ) ติดตามเอกสารลงนามและการจ่ายเงิน
   *   3 อนุมัติแล้ว       → บันทึกรับเอกสารลงนาม (→ 6)
   *   6 ได้รับเอกสารลงนาม → บันทึกจ่ายเงินแล้ว (→ 7)
   */
  if (afterApproval) {
    if (!canReview) return none;

    return {
      actions: [
        claim.status === STATUS.APPROVED
          ? ACTION.RECORD_SIGNED_DOCS
          : ACTION.MARK_PAID,
      ],
      blockedReason: "",
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
  RECORD_SIGNED_DOCS: { label: "ได้รับเอกสารลงนามแล้ว", tone: "teal" },
  MARK_PAID: { label: "จ่ายเงินแล้ว", tone: "green" },
};

// backend อาจส่งชื่อเหตุการณ์เป็นรูปอดีต/ชื่ออื่น → รวมให้เป็นกุญแจเดียว
const AUDIT_ALIAS = {
  CREATED: "CREATE",
  UPDATED: "UPDATE",
  SUBMITTED: "SUBMIT",
  RESUBMITTED: "RESUBMIT",
  RESEND: "RESUBMIT",
  RESENT: "RESUBMIT",
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
  SIGNED_DOCS_RECEIVED: "RECORD_SIGNED_DOCS",
  SIGNED_DOCS: "RECORD_SIGNED_DOCS",
  PAID: "MARK_PAID",
  PAY: "MARK_PAID",
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