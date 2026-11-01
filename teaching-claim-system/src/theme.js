export const C = {
  bg: "#F2F6F8",
  card: "#FFFFFF",
  border: "#DCEEF2",
  teal: "#3E7FC1",
  tealDark: "#1E5687",
  tealSoft: "#E8F0FA",
  ink: "#1E293B",
  sub: "#64748B",
  rose: "#E5484D",
  roseSoft: "#FCE9EA",
  violet: "#6E62C9",
  violetSoft: "#F1EFFB",
  ember: "#C4622D",
  emberSoft: "#FBEEE5",
  // สีสถานะ (ใช้ร่วมกับ STATUS_STYLE และป้าย/ข้อความแจ้งเตือนในหน้าต่าง ๆ)
  green: "#1E8E4F",
  greenSoft: "#DFF5E6",
  red: "#C23B3B",
  redSoft: "#FBE2E2",
  orange: "#B4531A",
  orangeSoft: "#FDEBDD",
  amber: "#9A7B06",
  amberSoft: "#FEF6D8",
  // สีของ "ขอให้ตรวจสอบหลักฐาน" — แยกจากม่วงของสถานะรออนุมัติให้เห็นชัด
  plum: "#A1348A",
  plumSoft: "#FBEAF6",
  plumBorder: "#F0C6E4",
  plumInk: "#6E1F5D",
};

// ป้าย/การ์ด "ขอให้ตรวจสอบหลักฐาน" (ผู้ตรวจสอบส่งต่อให้ผู้อนุมัติ) ใช้ร่วมกันทุกหน้า
export const ESCALATED_STYLE = {
  label: "ขอให้ตรวจสอบหลักฐาน",
  bg: C.plumSoft,
  fg: C.plum,
  border: C.plumBorder,
};

export const STATUS_STYLE = {
  Draft: { bg: "#EDF0F2", fg: "#5B6672", label: "แบบร่าง" },
  Submitted: { bg: C.amberSoft, fg: C.amber, label: "รอตรวจสอบ" },
  Reviewed: { bg: C.violetSoft, fg: C.violet, label: "ตรวจแล้ว รออนุมัติ" },
  Returned: { bg: C.orangeSoft, fg: C.orange, label: "ส่งคืนแก้ไข" },
  Approved: { bg: C.greenSoft, fg: C.green, label: "อนุมัติแล้ว รอจ่ายเงิน" },
  Paid: { bg: "#E1ECFB", fg: "#1D5FB8", label: "จ่ายเงินแล้ว" },
  Rejected: { bg: C.redSoft, fg: C.red, label: "ไม่อนุมัติ" },
  Unknown: { bg: "#EDF0F2", fg: "#5B6672", label: "ไม่ทราบสถานะ" },
};