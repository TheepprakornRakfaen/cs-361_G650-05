/*
 * ตัวช่วยเรื่องวันที่และเวลาสอน
 * เวลาสอนเก็บเป็น ชั่วโมง + นาที (ไม่ใช้ทศนิยม เพราะ 1.30 ชม. ทำให้คนงง)
 * และคิดเงินตามนาทีจริง
 */

// จำนวนนาทีของวันสอน 1 แถว
export function sessionMinutes(session) {
  return (
    Number(session?.hours || 0) * 60 +
    Number(session?.minutes || 0)
  );
}

// แปลงนาทีเป็นข้อความ เช่น 210 → "3 ชม. 30 นาที"
export function formatDuration(totalMinutes) {
  const minutesInt = Math.round(Number(totalMinutes) || 0);
  const hours = Math.floor(minutesInt / 60);
  const minutes = minutesInt % 60;

  if (hours && minutes) return `${hours} ชม. ${minutes} นาที`;
  if (hours) return `${hours} ชม.`;
  return `${minutes} นาที`;
}

// แปลงชั่วโมงทศนิยมแบบเก่าเป็น ชั่วโมง + นาที เช่น 1.5 → { hours: "1", minutes: "30" }
export function hoursToParts(decimalHours) {
  const totalMinutes = Math.round(Number(decimalHours || 0) * 60);

  return {
    hours: totalMinutes ? String(Math.floor(totalMinutes / 60)) : "",
    minutes: totalMinutes ? String(totalMinutes % 60) : "",
  };
}

// วันที่ YYYY-MM-DD → "13 พ.ย. 2569"
export function formatThaiDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) {
    return iso || "-";
  }

  return new Date(`${iso}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ปัดเงินเป็นทศนิยม 2 ตำแหน่ง
export function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
