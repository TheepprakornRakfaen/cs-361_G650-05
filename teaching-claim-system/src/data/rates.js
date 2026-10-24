/*
 * คำนวณอัตราค่าตอบแทนต่อชั่วโมงจาก "ตำแหน่งในรายวิชา"
 * ใช้ตารางเดียวกับหน้าแรก (infoData.js) เพื่อให้ตัวเลขตรงกันทั้งระบบ
 *
 * อัตราไม่ได้ให้ผู้ใช้กรอกเอง — มาจากข้อมูลการมอบหมายงาน (assignment)
 * ตอนนี้เป็นข้อมูลจำลองใน users.js รอ backend ส่งข้อมูลจริงมาแทน
 *
 * TODO: ยืนยันกับทีมว่าจะใช้อัตราชุดไหน (ชุดตามประกาศ หรือชุด Requirements 600/900/1,200)
 */
import {
  LECTURER_RATES,
  ACTIVITY_ASSISTANT_RATE,
  LECTURER_ASSISTANT_RATE,
} from "./infoData";
import { getAssignments } from "./users";

// อัตราค่าตอบแทนต่อชั่วโมงที่ใช้คำนวณจริงตอนนี้ (บาท) — จำนวนเงิน = ชั่วโมง × HOURLY_RATE
export const HOURLY_RATE = 40;

export const POSITIONS = {
  lecturer: "อาจารย์ผู้บรรยาย",
  activityAssistant: ACTIVITY_ASSISTANT_RATE.role,
  lecturerAssistant: LECTURER_ASSISTANT_RATE.role,
};

const PROGRAMS = {
  thai: "thaiSpecialProgram",
  english: "englishInternational",
};

/*
 * assignment = { courseCode, position, program, students } (ดู MOCK_ASSIGNMENTS ใน users.js)
 * คืน { rate, positionLabel, rateSource } — rate = 0 ถ้าหาอัตราไม่ได้
 */
export function getAssignmentRate(assignment) {
  const positionLabel = POSITIONS[assignment?.position] || "ไม่ระบุตำแหน่ง";

  if (assignment?.position === "lecturer") {
    const table = LECTURER_RATES[PROGRAMS[assignment.program]];

    if (!table) {
      return { rate: 0, positionLabel, rateSource: "ไม่พบประเภทหลักสูตร" };
    }

    // ตารางมี 2 ช่วง: ต่ำกว่า 200 คน / 200 คนขึ้นไป
    const row =
      Number(assignment.students || 0) >= 200
        ? table.rates[1]
        : table.rates[0];

    return {
      rate: row.rate,
      positionLabel,
      rateSource: `${table.title} · ${row.studentRange}`,
    };
  }

  if (assignment?.position === "activityAssistant") {
    return {
      rate: ACTIVITY_ASSISTANT_RATE.rate,
      positionLabel,
      rateSource: ACTIVITY_ASSISTANT_RATE.ratio,
    };
  }

  if (assignment?.position === "lecturerAssistant") {
    return {
      rate: LECTURER_ASSISTANT_RATE.rate,
      positionLabel,
      rateSource: LECTURER_ASSISTANT_RATE.ratio,
    };
  }

  return { rate: 0, positionLabel, rateSource: "ไม่พบอัตราของตำแหน่งนี้" };
}

// ชั่วโมงที่นับว่าใช้โควตาไปแล้ว = คำขอที่ยื่นแล้วและยังไม่ถูกปฏิเสธ
const COUNTED_STATUSES = ["Pending", "Approved"];

/*
 * รวมรายวิชาที่ผู้ใช้ได้รับมอบหมาย + อัตราตามตำแหน่ง + ชั่วโมงที่ใช้ไปจากคำขอของผู้ใช้เอง
 * ผู้ใช้ที่ไม่มี assignment จะได้ [] → ไม่มีวิชาให้เลือก ยื่นเบิกไม่ได้
 */
export function buildUserCourses(user, allCourses = [], userClaims = []) {
  const assignments = getAssignments(user?.username);

  return assignments
    .map((assignment) => {
      const course = allCourses.find((c) => c.code === assignment.courseCode);

      if (!course) return null;

      const { rate, positionLabel, rateSource } = getAssignmentRate(assignment);

      const used = userClaims
        .filter(
          (claim) =>
            claim.courseCode === course.code &&
            COUNTED_STATUSES.includes(claim.status)
        )
        .reduce((sum, claim) => sum + Number(claim.hours || 0), 0);

      return {
        ...course,
        rate,
        position: assignment.position,
        positionLabel,
        rateSource,
        used: Math.round(used * 100) / 100,
      };
    })
    .filter(Boolean);
}
