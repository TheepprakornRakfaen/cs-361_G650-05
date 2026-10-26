/*
 * [V4] Rules & Limits Configuration (กฎและเงื่อนไข - FR4)
 *
 * ระบบสามารถใช้กฎและเงื่อนไขที่เกี่ยวข้องเพื่อตรวจสอบเบื้องต้นหรือช่วยคำนวณยอดที่ขอเบิก เช่น:
 *  - สิทธิ์ตามบทบาท/ประเภทงาน
 *  - อัตราค่าตอบแทน
 *  - ข้อจำกัดด้านจำนวนครั้งหรือชั่วโมง
 *  - ช่วงเวลาที่มีผลบังคับใช้
 *  - งบประมาณจัดสรร (FR9)
 */

const STORAGE_KEY = "teaching-claim-system:system-rules:v4";

export const DEFAULT_RULES = {
  // ข้อจำกัดด้านเวลา
  dailyMaxHours: 12,
  monthlyMaxHoursTA: 40,
  monthlyMaxHoursTeacher: 60,
  courseDefaultQuota: 45,

  // การตรวจสอบความถูกต้องและความผิดปกติ (FR7)
  requireEvidence: true,
  checkDuplicateClaims: true,
  checkOverlappingSessions: true,
  checkQuotaBreach: true,
  checkClaimantBankInfo: true,

  // SLA ระยะเวลาพิจารณา (วันทำการ)
  slaBusinessDays: 10,

  // การบริหารงบประมาณ (FR9)
  annualBudget: 2500000,
  termBudget: 1250000,
  budgetAlertThresholdPercent: 80, // เตือนเมื่อใช้งบเกิน 80%

  // ภาคการศึกษาและปีการศึกษาปัจจุบัน
  currentAcademicYear: 2569,
  currentSemester: 1,

  // คำอธิบายกฎระเบียบ
  policyNotice:
    "การเบิกจ่ายค่าตอบแทนการสอนเป็นไปตามระเบียบมหาวิทยาลัยธรรมศาสตร์ว่าด้วยการจ่ายค่าตอบแทนอาจารย์และผู้ช่วยสอน พ.ศ. 2566",
};

export function getSystemRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RULES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_RULES, ...parsed };
  } catch (error) {
    console.error("Error loading system rules:", error);
    return DEFAULT_RULES;
  }
}

export function saveSystemRules(rules) {
  try {
    const merged = { ...getSystemRules(), ...rules, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.error("Error saving system rules:", error);
    return DEFAULT_RULES;
  }
}

export function resetSystemRules() {
  saveSystemRules(DEFAULT_RULES);
  return DEFAULT_RULES;
}

