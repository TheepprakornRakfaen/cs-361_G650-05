/*
 * [V4] Anomaly & Verification Detector (การตรวจสอบความผิดปกติ - FR7 & TC2)
 *
 * ตรวจสอบความผิดปกติที่สำคัญ:
 *  1. คำขอซ้ำ (Duplicate claim - ผู้ยื่นคนเดียวกัน วิชาเดียวกัน วันที่สอนตรงกัน)
 *  2. ข้อมูลไม่ครบ (Missing evidence หรือไม่ระบุวันที่สอน)
 *  3. รายการทับซ้อน (Overlapping teaching sessions / เวลาสอนเกินเกณฑ์ต่อวัน)
 *  4. เกินโควตารายวิชาหรือกฎเงื่อนไข (Quota breach / Monthly limit breach)
 *  5. บัญชีธนาคารไม่ครบถ้วน
 */
import { STATUS } from "../data/workflow";
import { getSystemRules } from "../data/rulesConfig";

const ACTIVE_STATUSES = [
  STATUS.SUBMITTED,
  STATUS.REVIEWED,
  STATUS.APPROVED,
  STATUS.PAID,
];

function extractDates(claim) {
  if (Array.isArray(claim?.sessions) && claim.sessions.length > 0) {
    return claim.sessions.map((s) => s.date).filter(Boolean);
  }
  if (Array.isArray(claim?.date) && claim.date.length > 0) {
    return claim.date.map((d) => (typeof d === "string" ? d : d.date)).filter(Boolean);
  }
  if (claim?.teachingDate) {
    return [claim.teachingDate];
  }
  return [];
}

// เจ้าของคำขอแบบ normalize สำหรับใช้เป็นคีย์ (sub > email > name)
function ownerKey(claim) {
  if (claim.ownerSub) return `sub:${claim.ownerSub}`;
  if (claim.claimantEmail) return `email:${String(claim.claimantEmail).toLowerCase()}`;
  if (claim.claimantName) return `name:${String(claim.claimantName).trim()}`;
  return "";
}

// รายวิชาแบบ normalize (section ก่อน course code)
function courseKey(claim) {
  if (claim.sectionId) return `sec:${claim.sectionId}`;
  if (claim.courseCode) return `course:${claim.courseCode}`;
  return "";
}

/*
 * [V4 scaling] สร้างดัชนีคำขอที่ยังมีผล เพื่อให้เช็ค "คำขอซ้ำ" เป็น O(1) ต่อคำขอ
 * แทนการวนทั้งลิสต์ (เดิมเป็น O(n²) เมื่อตรวจทั้งคิว)
 *
 * คีย์: ownerKey|courseKey|date → รายการ { id, code } ของคำขอที่ตรงกัน
 * ส่ง index นี้เข้า detectClaimAnomalies ผ่าน options.duplicateIndex
 */
export function buildDuplicateIndex(allClaims = []) {
  const index = new Map();

  allClaims.forEach((other) => {
    if (!ACTIVE_STATUSES.includes(other.status)) return;

    const owner = ownerKey(other);
    const course = courseKey(other);
    if (!owner || !course) return;

    extractDates(other).forEach((date) => {
      const key = `${owner}|${course}|${date}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ id: other.id, code: other.code });
    });
  });

  return index;
}

export function detectClaimAnomalies(claim, allClaims = [], courses = [], customRules = null, options = {}) {
  if (!claim) {
    return { hasIssues: false, hasErrors: false, hasWarnings: false, anomalies: [], clean: true, summary: "" };
  }

  const rules = customRules || getSystemRules();
  const anomalies = [];
  const duplicateIndex = options.duplicateIndex || null;

  const claimDates = extractDates(claim);
  const claimHours = Number(claim.hours || claim.hour || 0);

  // 1. ตรวจสอบคำขอซ้ำ (Duplicate Claim Check)
  if (rules.checkDuplicateClaims && claimDates.length > 0) {
    let duplicateHit = null;

    if (duplicateIndex) {
      // เร็ว: ใช้ดัชนีที่สร้างไว้ล่วงหน้า (O(จำนวนวันของคำขอนี้))
      const owner = ownerKey(claim);
      const course = courseKey(claim);

      if (owner && course) {
        for (const date of claimDates) {
          const matches = duplicateIndex.get(`${owner}|${course}|${date}`) || [];
          const other = matches.find((m) => String(m.id) !== String(claim.id));
          if (other) {
            duplicateHit = { ...other, date };
            break;
          }
        }
      }
    } else {
      // สำรอง: วนทั้งลิสต์ (พฤติกรรมเดิม เมื่อไม่ได้ส่งดัชนีมา)
      const isSameOwner = (other) => {
        if (claim.ownerSub && other.ownerSub) {
          return claim.ownerSub === other.ownerSub;
        }
        if (claim.claimantEmail && other.claimantEmail) {
          return claim.claimantEmail.toLowerCase() === other.claimantEmail.toLowerCase();
        }
        if (claim.claimantName && other.claimantName) {
          return claim.claimantName.trim() === other.claimantName.trim();
        }
        return false;
      };

      const duplicateClaim = allClaims.find((other) => {
        if (String(other.id) === String(claim.id)) return false;
        if (!ACTIVE_STATUSES.includes(other.status)) return false;
        if (!isSameOwner(other)) return false;

        const sameCourse =
          (claim.sectionId && other.sectionId && String(claim.sectionId) === String(other.sectionId)) ||
          (claim.courseCode && other.courseCode && claim.courseCode === other.courseCode);
        if (!sameCourse) return false;

        const otherDates = extractDates(other);
        return claimDates.some((d) => otherDates.includes(d));
      });

      if (duplicateClaim) {
        const otherDates = extractDates(duplicateClaim);
        const overlap = claimDates.filter((d) => otherDates.includes(d));
        duplicateHit = {
          id: duplicateClaim.id,
          code: duplicateClaim.code,
          date: overlap.join(", "),
        };
      }
    }

    if (duplicateHit) {
      const targetLabel = duplicateHit.code || duplicateHit.id;

      anomalies.push({
        id: "DUPLICATE_CLAIM",
        type: "DUPLICATE",
        severity: "error",
        title: "ตรวจพบคำขอซ้ำซ้อน",
        message: `มีวันที่สอน (${duplicateHit.date}) ซ้ำกับคำขอเลขที่ ${targetLabel} ที่ยื่นไว้ก่อนหน้า`,
        targetId: duplicateHit.id,
        targetCode: duplicateHit.code || duplicateHit.id,
      });
    }
  }

  // 2. ตรวจสอบเอกสารหลักฐาน (Missing Evidence Check)
  if (rules.requireEvidence && claim.status !== STATUS.DRAFT) {
    const hasEvidence =
      Number(claim.evidenceCount || 0) > 0 ||
      (Array.isArray(claim.evidence) && claim.evidence.length > 0) ||
      Boolean(claim.hasEvidence);

    // If explicit flag missingEvidence exists on mock/claim
    if (claim.missingEvidence || !hasEvidence) {
      anomalies.push({
        id: "MISSING_EVIDENCE",
        type: "MISSING_EVIDENCE",
        severity: "warning",
        title: "ยังไม่ได้แนบหลักฐานการสอน",
        message: "ไม่พบไฟล์เอกสารหลักฐานการสอนหรือใบลงเวลาที่ลงนามประกอบคำขอนี้",
      });
    }
  }

  // 3. ตรวจสอบข้อมูลวันที่และชั่วโมงการสอน (Missing / Invalid Dates or Hours)
  if (claimDates.length === 0 && claim.status !== STATUS.DRAFT) {
    anomalies.push({
      id: "MISSING_DATES",
      type: "INCOMPLETE",
      severity: "error",
      title: "ไม่พบข้อมูลวันที่สอน",
      message: "คำขอนี้ไม่มีการระบุวันที่และชั่วโมงปฏิบัติการสอน",
    });
  }

  if (claimHours <= 0 && claim.status !== STATUS.DRAFT) {
    anomalies.push({
      id: "ZERO_HOURS",
      type: "INCOMPLETE",
      severity: "error",
      title: "ชั่วโมงสอนไม่ถูกต้อง",
      message: "จำนวนชั่วโมงที่ขอเบิกต้องมากกว่า 0 ชั่วโมง",
    });
  }

  // 4. ตรวจสอบชั่วโมงเกินโควตารายวิชา (Quota Breach Check)
  if (rules.checkQuotaBreach) {
    const matchedCourse = courses.find(
      (c) =>
        (claim.sectionId && String(c.sectionId || c.section_id) === String(claim.sectionId)) ||
        (claim.courseCode && (c.code || c.course_code) === claim.courseCode)
    );

    if (matchedCourse) {
      const remainingQuota = Number(
        matchedCourse.remaining ??
        matchedCourse.remaining_hour ??
        Math.max(Number(matchedCourse.quota || matchedCourse.max_hour || 45) - Number(matchedCourse.used || matchedCourse.hour || 0), 0)
      );

      if (claimHours > remainingQuota && remainingQuota >= 0) {
        anomalies.push({
          id: "EXCEEDS_QUOTA",
          type: "EXCEEDS_QUOTA",
          severity: "warning",
          title: "ชั่วโมงขอเบิกเกินโควตาคงเหลือ",
          message: `ขอเบิก ${claimHours} ชม. แต่รายวิชานี้มีชั่วโมงคงเหลือ ${remainingQuota} ชม.`,
        });
      }
    } else if (claim.isOverQuota) {
      anomalies.push({
        id: "EXCEEDS_QUOTA",
        type: "EXCEEDS_QUOTA",
        severity: "warning",
        title: "ชั่วโมงขอเบิกเกินโควตารายวิชา",
        message: `จำนวนชั่วโมงที่ขอเบิก (${claimHours} ชม.) เกินโควตาที่จัดสรรไว้สำหรับรายวิชานี้`,
      });
    }
  }

  // 5. ตรวจสอบเพดานชั่วโมงสอนต่อวัน (Daily Limit Overlap)
  if (rules.checkOverlappingSessions && Array.isArray(claim.sessions)) {
    const dailyHoursMap = {};
    claim.sessions.forEach((s) => {
      if (!s.date) return;
      const h = Number(s.hours || 0) + Number(s.minutes || 0) / 60;
      dailyHoursMap[s.date] = (dailyHoursMap[s.date] || 0) + h;
    });

    const exceededDays = Object.entries(dailyHoursMap).filter(
      ([, h]) => h > rules.dailyMaxHours
    );

    if (exceededDays.length > 0) {
      anomalies.push({
        id: "DAILY_LIMIT_EXCEEDED",
        type: "OVERLAPPING",
        severity: "error",
        title: "เวลาสอนเกินเพดานต่อวัน",
        message: `วันที่ ${exceededDays.map(([d, h]) => `${d} (${Math.round(h * 10) / 10} ชม.)`).join(", ")} เกินเกณฑ์สูงสุด ${rules.dailyMaxHours} ชม./วัน`,
      });
    }
  }

  // 6. ตรวจสอบข้อมูลบัญชีธนาคาร (เมื่อถึงขั้นตอนอนุมัติ/จ่ายเงิน)
  if (
    rules.checkClaimantBankInfo &&
    [STATUS.APPROVED, STATUS.PAID].includes(claim.status) &&
    (!claim.paymentAccountNo || !claim.paymentBankName)
  ) {
    anomalies.push({
      id: "MISSING_PAYMENT_INFO",
      type: "PAYMENT_INFO",
      severity: "info",
      title: "ยังไม่มีข้อมูลบัญชีธนาคาร",
      message: "ไม่พบบัญชีธนาคารสำหรับโอนจ่ายเงินค่าตอบแทน",
    });
  }

  const hasIssues = anomalies.length > 0;
  const hasErrors = anomalies.some((a) => a.severity === "error");
  const hasWarnings = anomalies.some((a) => a.severity === "warning");

  return {
    hasIssues,
    hasErrors,
    hasWarnings,
    anomalies,
    clean: !hasIssues,
    summary: anomalies.map((a) => a.message).join(" | "),
  };
}

