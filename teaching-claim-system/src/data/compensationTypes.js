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

export function resetCompensationTypesToDefault() {
  saveCompensationTypes(DEFAULT_COMPENSATION_TYPES);
  return DEFAULT_COMPENSATION_TYPES;
}

