/*
 * [V4] Compensation Types Management (ประเภทค่าตอบแทน - FR2)
 *
 * ระบบสามารถรองรับค่าตอบแทนหลายประเภท โดยแต่ละประเภทมี:
 *  - ข้อมูลที่ต้องกรอก
 *  - หลักฐานที่ต้องแนบ
 *  - ผู้มีสิทธิ์ (Roles)
 *  - อัตราค่าตอบแทน (Rate)
 *  - เงื่อนไขและข้อจำกัด (เช่น เพดานชั่วโมง)
 *  - รองรับการเพิ่มประเภทใหม่ในอนาคตได้ (Dynamic/Configurable)
 */

const STORAGE_KEY = "teaching-claim-system:compensation-types:v4";

export const DEFAULT_COMPENSATION_TYPES = [
  {
    id: "TEACHER_LECTURE",
    name: "ค่าตอบแทนอาจารย์ผู้สอนบรรยาย",
    code: "LEC",
    eligibleRoles: ["TEACHER"],
    rateType: "HOURLY", // HOURLY | FIXED
    defaultRate: 600,
    maxHoursPerDay: 8,
    maxHoursPerMonth: 60,
    requiredFields: ["courseCode", "sectionId", "sessions", "teachingDate"],
    requiredEvidence: ["ใบลงเวลาสอน (Timesheet)", "ตารางสอนตามหลักสูตร"],
    description: "ค่าตอบแทนการสอนบรรยายสำหรับอาจารย์ประจำและอาจารย์พิเศษ อัตราตามระเบียบมหาวิทยาลัย",
    status: "ACTIVE",
    isSystem: true,
  },
  {
    id: "TA_LAB",
    name: "ค่าตอบแทนผู้ช่วยสอนภาคปฏิบัติการ (TA Lab)",
    code: "TA-LAB",
    eligibleRoles: ["TA"],
    rateType: "HOURLY",
    defaultRate: 400,
    maxHoursPerDay: 6,
    maxHoursPerMonth: 40,
    requiredFields: ["courseCode", "sectionId", "sessions", "teachingDate"],
    requiredEvidence: ["ใบลงเวลาปฏิบัติงานผู้ช่วยสอน", "ตารางคาบปฏิบัติการ"],
    description: "ค่าตอบแทนสำหรับผู้ช่วยสอนที่ดูแลห้องปฏิบัติการคอมพิวเตอร์และช่วยเหลือนักศึกษา",
    status: "ACTIVE",
    isSystem: true,
  },
  {
    id: "TA_GRADING",
    name: "ค่าตอบแทนผู้ช่วยตรวจการบ้าน/โครงงาน (TA Grading)",
    code: "TA-GRADE",
    eligibleRoles: ["TA"],
    rateType: "HOURLY",
    defaultRate: 300,
    maxHoursPerDay: 6,
    maxHoursPerMonth: 30,
    requiredFields: ["courseCode", "sectionId", "sessions", "teachingDate", "notes"],
    requiredEvidence: ["แบบบันทึกการตรวจงาน/โครงงาน", "ใบรับรองจากอาจารย์ผู้สอนประจำวิชา"],
    description: "ค่าตอบแทนสำหรับการช่วยตรวจแบบฝึกหัด การบ้าน และรายงานโครงงานตามเกณฑ์",
    status: "ACTIVE",
    isSystem: true,
  },
  {
    id: "SPECIAL_LECTURER",
    name: "ค่าตอบแทนอาจารย์พิเศษภายนอก",
    code: "GUEST",
    eligibleRoles: ["TEACHER"],
    rateType: "HOURLY",
    defaultRate: 900,
    maxHoursPerDay: 6,
    maxHoursPerMonth: 30,
    requiredFields: ["courseCode", "sectionId", "sessions", "teachingDate", "notes"],
    requiredEvidence: ["หนังสือเชิญวิทยากร/อาจารย์พิเศษ", "ใบลงเวลาสอน", "เอกสารประกอบการสอน"],
    description: "ค่าตอบแทนสำหรับผู้ทรงคุณวุฒิภายนอกที่ได้รับเชิญมาบรรยายพิเศษ",
    status: "ACTIVE",
    isSystem: true,
  },
];

export function getCompensationTypes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_COMPENSATION_TYPES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_COMPENSATION_TYPES;
  } catch (error) {
    console.error("Error loading compensation types:", error);
    return DEFAULT_COMPENSATION_TYPES;
  }
}

export function saveCompensationTypes(types) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
  } catch (error) {
    console.error("Error saving compensation types:", error);
  }
}

export function saveCompensationType(type) {
  const current = getCompensationTypes();
  const existsIndex = current.findIndex((item) => item.id === type.id);

  let updated;
  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = { ...updated[existsIndex], ...type, updatedAt: new Date().toISOString() };
  } else {
    const newType = {
      ...type,
      id: type.id || `TYPE_${Date.now()}`,
      status: type.status || "ACTIVE",
      isSystem: false,
      createdAt: new Date().toISOString(),
    };
    updated = [...current, newType];
  }

  saveCompensationTypes(updated);
  return updated;
}

export function deleteCompensationType(id) {
  const current = getCompensationTypes();
  // System types can only be deactivated, custom types can be removed
  const target = current.find((item) => item.id === id);
  if (target?.isSystem) {
    return saveCompensationType({ ...target, status: "INACTIVE" });
  }

  const filtered = current.filter((item) => item.id !== id);
  saveCompensationTypes(filtered);
  return filtered;
}

export function getCompTypesForRole(roleKey) {
  const types = getCompensationTypes().filter((t) => t.status === "ACTIVE");
  if (!roleKey) return types;

  const key = String(roleKey).toUpperCase();
  return types.filter((t) =>
    (t.eligibleRoles || []).some((r) => String(r).toUpperCase() === key)
  );
}

export function getCompTypeMeta(typeIdOrRole) {
  const types = getCompensationTypes();
  if (!typeIdOrRole) return types[0] || DEFAULT_COMPENSATION_TYPES[0];

  const byId = types.find((t) => t.id === typeIdOrRole || t.code === typeIdOrRole);
  if (byId) return byId;

  // Fallback by role
  const roleKey = String(typeIdOrRole).toUpperCase();
  if (roleKey.includes("TA") || roleKey.includes("ASSISTANT")) {
    return types.find((t) => t.id === "TA_LAB") || DEFAULT_COMPENSATION_TYPES[1];
  }

  return types.find((t) => t.id === "TEACHER_LECTURE") || DEFAULT_COMPENSATION_TYPES[0];
}

/*
 * [V4] หา "ประเภทค่าตอบแทนละเอียด" ของคำขอหนึ่ง ๆ เพื่อใช้จัดกลุ่มในรายงาน
 *
 * ลำดับการพิจารณา (backend-ready):
 *   1) คำขอระบุ type_id / type_code / compensation_type มาตรง ๆ → ใช้ค่านั้น
 *   2) ไม่ระบุ → เดาจากบทบาท/ตำแหน่งของผู้ยื่น:
 *        INSTRUCTOR/TEACHER/LECTURER → ค่าสอนบรรยาย (TEACHER_LECTURE)
 *        GUEST/SPECIAL               → อาจารย์พิเศษ (SPECIAL_LECTURER)
 *        GRADE/ตรวจงาน               → ผู้ช่วยตรวจงาน (TA_GRADING)
 *        TA/ASSISTANT อื่น ๆ          → ผู้ช่วยสอนภาคปฏิบัติ (TA_LAB)
 * คืน { id, name, code } เสมอ (ไม่เป็น null)
 */
export function resolveClaimCompType(claim = {}) {
  const types = getCompensationTypes();

  const pick = (t) => ({ id: t.id, name: t.name, code: t.code });

  // 1) ระบุประเภทมาตรง ๆ
  const explicit =
    claim.compTypeId ||
    claim.type_id ||
    claim.type_code ||
    claim.compensation_type ||
    claim.compensationType;

  if (explicit != null && explicit !== "") {
    const key = String(explicit).toUpperCase();
    const direct = types.find(
      (t) =>
        String(t.id).toUpperCase() === key ||
        String(t.code).toUpperCase() === key
    );
    if (direct) return pick(direct);
  }

  // 2) เดาจากบทบาท/ตำแหน่ง
  const role = String(
    claim.claimantRole || claim.owner_role || claim.position || claim.role || ""
  ).toUpperCase();

  const byId = (id) => types.find((t) => t.id === id);

  if (/GUEST|SPECIAL|พิเศษ|ภายนอก/.test(role)) {
    return pick(byId("SPECIAL_LECTURER") || byId("TEACHER_LECTURE") || types[0]);
  }
  if (/GRADE|GRADING|ตรวจ/.test(role)) {
    return pick(byId("TA_GRADING") || byId("TA_LAB") || types[0]);
  }
  if (/TA|ASSISTANT|ช่วยสอน|ผู้ช่วย/.test(role)) {
    return pick(byId("TA_LAB") || types[0]);
  }

  // อาจารย์ผู้สอน / ไม่ระบุ → ค่าสอนบรรยาย
  return pick(byId("TEACHER_LECTURE") || types[0]);
}

export function resetCompensationTypesToDefault() {
  saveCompensationTypes(DEFAULT_COMPENSATION_TYPES);
  return DEFAULT_COMPENSATION_TYPES;
}

