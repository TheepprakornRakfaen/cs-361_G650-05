/*
 * โหมดทดลอง (dev) — เข้าระบบโดยไม่ต้องล็อกอิน Cognito
 *
 * ใช้ระหว่างที่ Cognito ยังตั้งค่าไม่เสร็จ เพื่อเปิดดูหน้าหลังบ้าน (แอดมิน/เจ้าหน้าที่) ได้
 *  - เปิดอัตโนมัติเมื่อรัน `npm run dev` (ทุกคนในทีมใช้ได้เลย ไม่ต้องตั้ง .env)
 *    ปิดได้ด้วย VITE_DEV_AUTH_BYPASS=false ใน .env.local
 *  - ตอน build จริง (npm run build) DEV = false → โหมดนี้ปิดเสมอ และโค้ดส่วนนี้ถูกตัดทิ้ง
 *  - ข้อมูลทั้งหมดเป็นข้อมูลจำลองในหน่วยความจำ (services/devMockApi.js) ไม่แตะ backend จริง
 *  - เลือกบทบาทได้ที่หน้าเข้าสู่ระบบ (กล่อง "โหมดทดลอง") — ล็อกอินด้วย Cognito จริงยังใช้ได้ตามปกติ
 *
 * TODO: ลบไฟล์นี้กับ devMockApi.js เมื่อ Cognito พร้อมใช้งาน
 */
import { ROLE, resolveRoles, getRoleLabel } from "../data/roles";

export const DEV_AUTH_BYPASS =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_AUTH_BYPASS !== "false";

const STORAGE_KEY = "teaching-claim-system:dev-role";

// Cognito group ที่จำลองให้แต่ละบทบาท (ตรงกับ GROUP_TO_ROLE ใน data/roles.js)
const DEV_PROFILES = {
  [ROLE.ADMIN]: { group: "ADMIN", name: "ผู้ดูแลระบบ (ทดลอง)", email: "admin@dev.local" },
  [ROLE.REVIEWER]: { group: "STAFF", name: "เจ้าหน้าที่ตรวจสอบ (ทดลอง)", email: "staff@dev.local" },
  [ROLE.APPROVER]: { group: "APPROVER", name: "ผู้อนุมัติ (ทดลอง)", email: "approver@dev.local" },
  [ROLE.TEACHER]: { group: "TEACHER", name: "อ.ทดลอง ระบบ", email: "teacher@dev.local" },
};

export const DEV_ROLE_OPTIONS = Object.keys(DEV_PROFILES).map((role) => ({
  role,
  label: getRoleLabel(role),
}));

export function buildDevUser(role) {
  const profile = DEV_PROFILES[role];

  if (!profile) return null;

  const groups = [profile.group];
  const { roles, primary } = resolveRoles(groups);

  return {
    username: profile.email.split("@")[0],
    cognitoSub: `dev-${role.toLowerCase()}`,
    email: profile.email,
    name: profile.name,
    firstName: profile.name,
    role: getRoleLabel(primary),
    roleKey: primary,
    roles,
    groups,
    isDevUser: true,
  };
}

function readRole() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// ผู้ใช้ทดลองที่เลือกไว้ (null = ไม่ได้อยู่ในโหมดทดลอง)
export function getDevUser() {
  if (!DEV_AUTH_BYPASS) return null;

  const role = readRole();
  return role ? buildDevUser(role) : null;
}

export function startDevSession(role) {
  if (!DEV_AUTH_BYPASS) return null;

  try {
    sessionStorage.setItem(STORAGE_KEY, role);
  } catch {
    /* เก็บไม่ได้ → รีเฟรชแล้วต้องเลือกใหม่ */
  }

  return buildDevUser(role);
}

export function endDevSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ไม่เป็นไร */
  }
}
