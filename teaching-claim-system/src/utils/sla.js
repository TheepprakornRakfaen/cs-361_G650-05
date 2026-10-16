/*
 * ระยะเวลารอพิจารณาคำขอ
 * เจ้าหน้าที่แจ้งว่าตอบกลับภายใน 10 วันทำการ (ไม่นับเสาร์-อาทิตย์)
 */
export const SLA_BUSINESS_DAYS = 10;

// จำนวนวันทำการตั้งแต่ from ถึงวันนี้ (ไม่นับวันแรก, ไม่นับเสาร์-อาทิตย์)
export function businessDaysSince(from, to = new Date()) {
  const start = new Date(from);

  if (!from || Number.isNaN(start.getTime())) return null;

  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  let count = 0;

  while (day < end) {
    day.setDate(day.getDate() + 1);
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }

  return count;
}

/*
 * ระดับความเร่งด่วน
 *  ok      = ยังมีเวลา
 *  warning = ใกล้ครบกำหนด (เหลือ ≤ 3 วันทำการ)
 *  overdue = เกินกำหนดแล้ว
 */
export function slaLevel(days) {
  if (days === null || days === undefined) return "ok";
  if (days > SLA_BUSINESS_DAYS) return "overdue";
  if (days >= SLA_BUSINESS_DAYS - 3) return "warning";
  return "ok";
}

export const SLA_STYLE = {
  ok: { bg: "#EEF2F5", fg: "#5B6672" },
  warning: { bg: "#FEF6D8", fg: "#9A7B06" },
  overdue: { bg: "#FBE2E2", fg: "#C23B3B" },
};
