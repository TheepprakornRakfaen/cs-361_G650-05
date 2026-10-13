import { HOURLY_RATE } from "../data/rates";
import { roundMoney, formatThaiMonth, hoursToParts } from "../utils/time";

function sessionToHour(
  session
) {
  const hours =
    Number(
      session?.hours || 0
    );

  const minutes =
    Number(
      session?.minutes || 0
    );

  return Number(
    (
      hours +
      minutes / 60
    ).toFixed(2)
  );
}

export function buildClaimApiPayload(form) {
  const status = form.status;
  // console.log("Status:", status);
  const sessions =
    Array.isArray(
      form?.sessions
    )
      ? form.sessions.filter(
          (session) =>
            session.date
        )
      : [];

  /*
   * 1 Claim = หลายวันสอน (ตาราง claim_date)
   * date ส่งเป็น array เสมอ แม้มีวันเดียว: [{ date, hour }]
   */
  if (
    sessions.length === 0
  ) {
    throw new Error(
      "กรุณาระบุวันที่สอนอย่างน้อย 1 วัน"
    );
  }

  // ชั่วโมงของแต่ละวัน → claim_date.hour
  const date =
    sessions.map(
      (session) => ({
        date: session.date,
        hour: sessionToHour(session),
      })
    );

  if (
    date.some(
      (item) => item.hour <= 0
    )
  ) {
    throw new Error(
      "กรุณาระบุจำนวนชั่วโมงที่สอนให้ครบทุกวัน"
    );
  }

  // ชั่วโมงรวมทุกวัน
  const hour =
    Number(
      date
        .reduce(
          (sum, item) =>
            sum + item.hour,
          0
        )
        .toFixed(2)
    );

  return {
    academic_term:
      Number(form.termId),

    period_id:
      Number(form.periodId),

    section_id:
      Number(form.sectionId),
    status,
    date,

    hour,

    note:
      form.notes?.trim() ||
      null,
  };
}

export function normalizeClaim(
  raw
) {
  const numericStatus =
    Number(raw.status);

  const status =
    numericStatus === 0
      ? "Draft"
      : numericStatus === 1
        ? "Submitted"
        : numericStatus === 2
          ? "Cancelled"
          : "Draft";

  /*
   * date จาก GET เป็น array [{ id, claim_id, date, hour }] (ตาราง claim_date)
   * รองรับรูปแบบเก่าที่ date เป็น string ตัวเดียวด้วย
   */
  const dateList = (
    Array.isArray(raw.date)
      ? raw.date
      : raw.date
        ? [{ date: raw.date, hour: raw.hour }]
        : []
  )
    .filter((item) => item?.date)
    .sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

  // ชั่วโมงรวม: ใช้ค่าจาก backend ถ้ามี ไม่งั้นรวมจากแต่ละวัน
  const hours =
    raw.hour != null
      ? Number(raw.hour)
      : dateList.reduce(
          (sum, item) => sum + Number(item.hour || 0),
          0
        );

  const teachingDate =
    dateList[0]?.date || "";

  return {
    ...raw,

    id:
      raw.id,

    claimId:
      raw.id,

    status,

    termId:
      raw.academic_term,

    semester:
      raw.term || "",

    periodId:
      raw.period_id,

    sectionId:
      raw.section_id,

    courseCode:
      raw.course_code ||
      "",

    courseName:
      raw.course_name ||
      raw.course_name_en ||
      "",

    // วันสอนวันแรก
    teachingDate,

    // เดือนที่สอน เช่น "ตุลาคม 2569" (ใช้แสดงในตารางคำขอ)
    month:
      formatThaiMonth(teachingDate),

    // วันสอนแต่ละวัน → รูปแบบเดียวกับ sessions ในฟอร์ม
    sessions:
      dateList.map((item) => ({
        id:
          `session-${item.id ?? `${raw.id}-${item.date}`}`,

        date:
          item.date,

        ...hoursToParts(item.hour),
      })),

    hours,

    // backend ไม่ได้ส่งเงินมา → คำนวณเองจาก hour × HOURLY_RATE
    rate:
      HOURLY_RATE,

    amount:
      roundMoney(
        hours * HOURLY_RATE
      ),

    notes:
      raw.note || "",

    createdAt:
      raw.created_at,

    submittedAt:
      raw.submitted_at,

    round:
      raw.period_month
        ? `เดือน ${raw.period_month}`
        : "",
  };
}

/*
 * รหัสคำขอสำหรับแสดงผล/ค้นหา (id จริงยังเป็น UUID เหมือนเดิม)
 * รูปแบบ: <รหัสวิชา>-<ภาค/ปี 2 หลัก>-R<เดือนของรอบ>-<วันยื่น DDMMYY พ.ศ.>-<4 ตัวแรกของ id>
 * เช่น CS223-1/69-R10-131069-6822
 * ต่อท้าย 4 ตัวจาก id กันรหัสซ้ำเมื่อยื่นวิชาเดียวกันรอบเดียวกันในวันเดียวกัน
 */
export function buildClaimCode({
  id,
  courseCode,
  termLabel,
  periodMonth,
  submittedAt,
}) {
  const parts = [];

  if (courseCode && courseCode !== "-") {
    parts.push(courseCode);
  }

  // "1/2569" → "1/69"
  if (termLabel) {
    parts.push(
      String(termLabel).replace(
        /\/\d{2}(\d{2})$/,
        "/$1"
      )
    );
  }

  if (periodMonth) {
    parts.push(
      `R${String(periodMonth).padStart(2, "0")}`
    );
  }

  const submitted =
    submittedAt
      ? new Date(submittedAt)
      : null;

  if (
    submitted &&
    !Number.isNaN(submitted.getTime())
  ) {
    const dd = String(submitted.getDate()).padStart(2, "0");
    const mm = String(submitted.getMonth() + 1).padStart(2, "0");
    const yy = String((submitted.getFullYear() + 543) % 100).padStart(2, "0");
    parts.push(`${dd}${mm}${yy}`);
  }

  const suffix = String(id ?? "")
    .replace(/[^0-9a-z]/gi, "")
    .slice(0, 4)
    .toUpperCase();

  if (suffix) {
    parts.push(suffix);
  }

  return parts.join("-");
}

export function normalizeClaimsResponse(
  data
) {
  const rows =
    Array.isArray(data)
      ? data
      : Array.isArray(
          data?.claims
        )
        ? data.claims
        : [];

  return rows.map(
    normalizeClaim
  );
}