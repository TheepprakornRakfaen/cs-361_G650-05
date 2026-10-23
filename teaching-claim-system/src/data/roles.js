/*
 * [V3][FRONT] Role-Based Access — ศูนย์กลางนิยามบทบาทและสิทธิ์ฝั่ง UI
 *
 * หลักการ
 *  - บทบาทมาจาก Cognito Group (claim "cognito:groups" ใน ID token)
 *  - ฝั่ง UI ใช้ไฟล์นี้ "ซ่อน/แสดง" เมนู ปุ่ม และข้อมูลเท่านั้น
 *    ความปลอดภัยจริงต้องให้ backend ตรวจสิทธิ์ทุก request (งาน #3, #5)
 *  - ถ้าชื่อ Group ใน Cognito ต่างจากนี้ แก้ที่ GROUP_TO_ROLE ที่เดียว
 */

export const ROLE = {
  TEACHER: "TEACHER",
  TA: "TA",
  REVIEWER: "REVIEWER",
  APPROVER: "APPROVER",
  ADMIN: "ADMIN",
};

/*
 * Cognito Group → role
 * STAFF คือกลุ่มเจ้าหน้าที่เดิมของระบบ → ทำหน้าที่ผู้ตรวจสอบ
 */
export const GROUP_TO_ROLE = {
  TEACHER: ROLE.TEACHER,
  TA: ROLE.TA,
  STAFF: ROLE.REVIEWER,
  REVIEWER: ROLE.REVIEWER,
  APPROVER: ROLE.APPROVER,
  ADMIN: ROLE.ADMIN,
};

export const ROLE_META = {
  [ROLE.TEACHER]: { label: "อาจารย์ผู้สอน", bg: "#E8F0FA", fg: "#1E5687" },
  [ROLE.TA]: { label: "ผู้ช่วยสอน (TA)", bg: "#E8F0FA", fg: "#1E5687" },
  [ROLE.REVIEWER]: { label: "เจ้าหน้าที่ตรวจสอบ", bg: "#F1EFFB", fg: "#6E62C9" },
  [ROLE.APPROVER]: { label: "ผู้อนุมัติ", bg: "#DFF5E6", fg: "#1E8E4F" },
  [ROLE.ADMIN]: { label: "ผู้ดูแลระบบ", bg: "#FBEEE5", fg: "#C4622D" },
};

// ลำดับความสำคัญ เมื่อผู้ใช้อยู่หลาย Group ใช้ตัวแรกที่เจอเป็น "บทบาทหลัก" ที่แสดงผล
export const ROLE_PRIORITY = [
  ROLE.ADMIN,
  ROLE.APPROVER,
  ROLE.REVIEWER,
  ROLE.TEACHER,
  ROLE.TA,
];

export const PERMISSION = {
  CLAIM_CREATE: "claim.create", // สร้าง/ยื่น/แก้ไขคำขอของตัวเอง
  CLAIM_VIEW_ALL: "claim.view_all", // เห็นคำขอของผู้อื่น (คิวตรวจสอบ)
  CLAIM_REVIEW: "claim.review", // ตรวจสอบ / ส่งกลับแก้ไข
  CLAIM_APPROVE: "claim.approve", // อนุมัติ / ไม่อนุมัติ
  FINANCE_VIEW: "finance.view", // เห็นอัตราค่าตอบแทนและยอดเงิน
  EVIDENCE_VIEW: "evidence.view", // เปิดดูเอกสารประกอบ
  PII_VIEW: "pii.view", // เห็นข้อมูลส่วนบุคคลของผู้ยื่นแบบเต็ม
  AUDIT_VIEW: "audit.view", // เห็นประวัติการดำเนินการของคำขอ
  AUDIT_VIEW_ALL: "audit.view_all", // ค้นประวัติรวมทุกคำขอ / export
  DATA_EXPORT: "data.export", // ส่งออก CSV รายการคำขอ (มีชื่อผู้ยื่น/ยอดเงิน)
  SETTINGS_MANAGE: "settings.manage", // ดูบทบาท/สิทธิ์ และจัดการข้อมูลพื้นฐาน/กฎ/การตั้งค่า
};

const P = PERMISSION;

/*
 * ผู้ยื่นคำขอ (อาจารย์ / TA): เห็นเฉพาะคำขอ ยอดเงิน เอกสาร และประวัติ "ของตัวเอง"
 * (backend ต้องกรองตามเจ้าของคำขอ — ฝั่ง UI แค่ไม่แสดงเมนู/ปุ่มของคนอื่น)
 */
const CLAIMANT = [
  P.CLAIM_CREATE,
  P.FINANCE_VIEW,
  P.EVIDENCE_VIEW,
  P.AUDIT_VIEW,
];

/*
 * ตารางสิทธิ์ตามหลัก least privilege (อ้างอิงตารางบทบาทในเอกสารโครงการ)
 *
 *  บทบาท              ยื่น  คิว  ส่งกลับ  อนุมัติ/ไม่อนุมัติ  เงิน  เอกสาร  PII   ประวัติ     export  ตั้งค่า
 *  อาจารย์ / TA        ✓    –    –       –       ของตน  ของตน    –     ของตน      –       –
 *  เจ้าหน้าที่ตรวจสอบ   –    ✓    ✓       –       ✓     ✓       ✓     ต่อคำขอ     –       –
 *  ผู้อนุมัติ           –    ✓    ✓       ✓       ✓     ✓       ✓     ทั้งระบบ    ✓       –
 *  ผู้ดูแลระบบ/บริหาร   –    ✓*   –       –       สรุป   –       –     ทั้งระบบ    ✓       ✓
 *  (* อ่านอย่างเดียว) — ผู้ดูแลระบบไม่แตะเอกสารแนบ/ข้อมูลส่วนบุคคล และไม่ตรวจสอบ-อนุมัติ
 *    เพื่อแยกหน้าที่ (segregation of duties) แก้ที่ตารางนี้ที่เดียวถ้านโยบายเปลี่ยน
 */
export const ROLE_PERMISSIONS = {
  [ROLE.TEACHER]: CLAIMANT,
  [ROLE.TA]: CLAIMANT,
  [ROLE.REVIEWER]: [
    P.CLAIM_VIEW_ALL,
    P.CLAIM_REVIEW, // ตรวจสอบแล้วส่งกลับให้แก้ได้ แต่ไม่มีสิทธิ์อนุมัติ (ดู getAllowedActions)
    P.FINANCE_VIEW,
    P.EVIDENCE_VIEW,
    P.PII_VIEW,
    P.AUDIT_VIEW,
  ],
  [ROLE.APPROVER]: [
    P.CLAIM_VIEW_ALL,
    P.CLAIM_REVIEW,
    P.CLAIM_APPROVE,
    P.FINANCE_VIEW,
    P.EVIDENCE_VIEW,
    P.PII_VIEW,
    P.AUDIT_VIEW,
    P.AUDIT_VIEW_ALL,
    P.DATA_EXPORT,
  ],
  // ผู้บริหาร / ผู้ดูแลระบบ: ดูภาพรวม ประวัติรวม ตั้งค่าและสิทธิ์ — ไม่ตัดสินคำขอ ไม่เห็นเอกสาร/PII
  [ROLE.ADMIN]: [
    P.CLAIM_VIEW_ALL,
    P.FINANCE_VIEW,
    P.AUDIT_VIEW,
    P.AUDIT_VIEW_ALL,
    P.DATA_EXPORT,
    P.SETTINGS_MANAGE,
  ],
};

/* คำอธิบายบทบาท (ตามตาราง "ผู้ใช้งานหลักของระบบ" ในเอกสาร) */
export const ROLE_DESCRIPTION = {
  [ROLE.TEACHER]:
    "สร้างและยื่นคำขอเบิกค่าตอบแทนที่ตนมีสิทธิ์ ดูรายละเอียด ติดตามสถานะ และแก้ไขเมื่อถูกส่งกลับ",
  [ROLE.TA]:
    "สร้างและยื่นคำขอตามงานที่ได้รับมอบหมาย พร้อมแนบหลักฐาน ติดตามสถานะ และแก้ไขเมื่อถูกส่งกลับ",
  [ROLE.REVIEWER]:
    "ตรวจสอบความครบถ้วน ความถูกต้อง สิทธิ์ และเอกสารประกอบ แล้วส่งต่อผู้อนุมัติ หรือส่งกลับให้ผู้ยื่นแก้ไข (ไม่มีสิทธิ์อนุมัติ)",
  [ROLE.APPROVER]:
    "พิจารณาอนุมัติ ไม่อนุมัติ หรือส่งกลับคำขอที่ผ่านการตรวจสอบแล้ว พร้อมดูประวัติการดำเนินการทั้งระบบและส่งออกรายงาน",
  [ROLE.ADMIN]:
    "ดูข้อมูลสรุปและประวัติทั้งระบบ จัดการบทบาท/สิทธิ์และการตั้งค่า โดยไม่เข้าถึงเอกสารแนบหรือข้อมูลส่วนบุคคล",
};

/* ชื่อ/กลุ่มของแต่ละสิทธิ์ — ใช้แสดงในหน้า "บทบาทและสิทธิ์" */
export const PERMISSION_META = [
  { key: P.CLAIM_CREATE, group: "คำขอ", label: "สร้าง / ยื่น / แก้ไขคำขอของตนเอง" },
  { key: P.CLAIM_VIEW_ALL, group: "คำขอ", label: "ดูคำขอของผู้อื่น (คิวคำขอ)" },
  { key: P.CLAIM_REVIEW, group: "ขั้นตอนพิจารณา", label: "ตรวจสอบ ส่งต่อ และส่งกลับให้แก้ไข" },
  { key: P.CLAIM_APPROVE, group: "ขั้นตอนพิจารณา", label: "อนุมัติ / ไม่อนุมัติคำขอ" },
  { key: P.FINANCE_VIEW, group: "ข้อมูลที่จำกัดสิทธิ์", label: "ดูอัตราค่าตอบแทนและยอดเงิน" },
  { key: P.EVIDENCE_VIEW, group: "ข้อมูลที่จำกัดสิทธิ์", label: "เปิดดูเอกสารประกอบ" },
  { key: P.PII_VIEW, group: "ข้อมูลที่จำกัดสิทธิ์", label: "ดูข้อมูลส่วนบุคคลของผู้ยื่นแบบเต็ม" },
  { key: P.AUDIT_VIEW, group: "ประวัติและรายงาน", label: "ดูประวัติการดำเนินการรายคำขอ" },
  { key: P.AUDIT_VIEW_ALL, group: "ประวัติและรายงาน", label: "ค้นประวัติรวมทุกคำขอ" },
  { key: P.DATA_EXPORT, group: "ประวัติและรายงาน", label: "ส่งออกข้อมูล (CSV)" },
  { key: P.SETTINGS_MANAGE, group: "ผู้ดูแลระบบ", label: "ดูบทบาท/สิทธิ์ และตั้งค่าระบบ" },
];

/*
 * สิทธิ์ที่ "ขอบเขตจำกัดเฉพาะของตนเอง" สำหรับผู้ยื่น (แสดงเป็น "เฉพาะของตน" ในตาราง)
 */
export const OWN_ONLY_PERMISSIONS = new Set([
  P.FINANCE_VIEW,
  P.EVIDENCE_VIEW,
  P.AUDIT_VIEW,
]);

/*
 * แปลง Cognito groups → ข้อมูลบทบาทที่ UI ใช้
 */
export function resolveRoles(groups = []) {
  const roles = [
    ...new Set(
      groups.map((group) => GROUP_TO_ROLE[group]).filter(Boolean)
    ),
  ];

  const primary =
    ROLE_PRIORITY.find((role) => roles.includes(role)) || null;

  return { roles, primary };
}

export function getRoleLabel(roleKey) {
  return ROLE_META[roleKey]?.label || "ผู้ใช้งานระบบ";
}

export function getPermissions(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  return new Set(
    roles.flatMap((role) => ROLE_PERMISSIONS[role] || [])
  );
}

export function can(user, permission) {
  return getPermissions(user).has(permission);
}

export function hasAnyRole(user, ...roles) {
  return roles.some((role) => user?.roles?.includes(role));
}

// ตัดสินคำขอได้ (ตรวจสอบ/อนุมัติ/ส่งกลับ) — ผู้ดูแลระบบดูได้อย่างเดียว จึงเป็น false
export const canDecideClaims = (user) =>
  can(user, P.CLAIM_REVIEW) || can(user, P.CLAIM_APPROVE);

// เป็นผู้ยื่นคำขอ (อาจารย์ / TA)
export const isClaimant = (user) => can(user, P.CLAIM_CREATE);

// เป็นผู้ที่ทำงานในคิวคำขอของผู้อื่น (ตรวจสอบ / อนุมัติ / ผู้ดูแล)
export const canAccessQueue = (user) => can(user, P.CLAIM_VIEW_ALL);

/*
 * สิทธิ์เข้าแต่ละหน้า (view) — ไม่อยู่ในรายการ = ทุกคนที่ล็อกอินแล้วเข้าได้
 * ต้องสอดคล้องกับ PROTECTED_VIEWS ใน App.jsx
 */
export const VIEW_PERMISSION = {
  dashboard: P.CLAIM_CREATE,
  assignments: P.CLAIM_CREATE,
  myclaims: P.CLAIM_CREATE,
  create: P.CLAIM_CREATE,
  rounds: P.CLAIM_CREATE,
  "claim-create": P.CLAIM_CREATE,
  admin: P.CLAIM_VIEW_ALL,
  review: P.CLAIM_VIEW_ALL,
  report: P.CLAIM_VIEW_ALL, // รายงานสรุปยอดเบิก
  auditlog: P.AUDIT_VIEW_ALL,
  settings: P.SETTINGS_MANAGE,
};

export function canAccessView(user, view) {
  const required = VIEW_PERMISSION[view];

  return !required || can(user, required);
}

// หน้าแรกหลังล็อกอิน ตามบทบาท
export function getLandingView(user) {
  if (canAccessQueue(user) && !isClaimant(user)) {
    return "admin";
  }

  return "home";
}

/*
 * ซ่อนเลขบัญชีธนาคาร เหลือ 4 ตัวท้าย เช่น 1234567890 → xxxxxx7890
 * ถ้า backend ส่งมาปิดบังแล้ว (มี x * •) ใช้ตามนั้น / ถ้ามีตัวเลขไม่ถึง 4 ตัว ไม่แสดง
 * ⚠️ นี่เป็นเพียงชั้นป้องกันฝั่งหน้าเว็บ backend ควรส่งมาแบบปิดบังแล้วตั้งแต่ต้น
 */
export function maskAccount(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  if (/[xX*•]/.test(text)) return text;

  const digits = text.replace(/\D/g, "");

  if (digits.length < 4) return "";

  return `${"x".repeat(Math.max(digits.length - 4, 3))}${digits.slice(-4)}`;
}

/*
 * ซ่อนอีเมลบางส่วน: nitcha@tu.ac.th → n•••••@tu.ac.th
 * ใช้เมื่อผู้ดูไม่มีสิทธิ์ pii.view
 */
export function maskEmail(email) {
  const text = String(email || "");
  const at = text.indexOf("@");

  if (at < 1) {
    return text ? "••••••" : "";
  }

  return `${text[0]}${"•".repeat(Math.min(at - 1, 5))}${text.slice(at)}`;
}