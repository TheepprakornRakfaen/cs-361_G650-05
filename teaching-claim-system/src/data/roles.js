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
};

const P = PERMISSION;

const CLAIMANT = [
  P.CLAIM_CREATE,
  P.FINANCE_VIEW,
  P.EVIDENCE_VIEW,
  P.AUDIT_VIEW,
];

export const ROLE_PERMISSIONS = {
  [ROLE.TEACHER]: CLAIMANT,
  [ROLE.TA]: CLAIMANT,
  [ROLE.REVIEWER]: [
    P.CLAIM_VIEW_ALL,
    P.CLAIM_REVIEW,
    P.FINANCE_VIEW,
    P.EVIDENCE_VIEW,
    P.PII_VIEW,
    P.AUDIT_VIEW,
  ],
  [ROLE.APPROVER]: [
    P.CLAIM_VIEW_ALL,
    P.CLAIM_APPROVE,
    P.FINANCE_VIEW,
    P.EVIDENCE_VIEW,
    P.PII_VIEW,
    P.AUDIT_VIEW,
    P.AUDIT_VIEW_ALL,
  ],
  // ผู้ดูแลระบบ: ดูภาพรวมและประวัติได้ แต่ไม่เห็นยอดเงิน/เอกสาร และไม่อนุมัติแทนใคร
  [ROLE.ADMIN]: [P.CLAIM_VIEW_ALL, P.AUDIT_VIEW, P.AUDIT_VIEW_ALL],
};

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
  review: P.CLAIM_VIEW_ALL,
  auditlog: P.AUDIT_VIEW_ALL,
};

export function canAccessView(user, view) {
  const required = VIEW_PERMISSION[view];

  return !required || can(user, required);
}

// หน้าแรกหลังล็อกอิน ตามบทบาท
export function getLandingView(user) {
  if (canAccessQueue(user) && !isClaimant(user)) {
    return "review";
  }

  return "home";
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