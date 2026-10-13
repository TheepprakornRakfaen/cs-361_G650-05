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
};

export const STATUS_STYLE = {
  Draft: { bg: "#EDF0F2", fg: "#5B6672", label: "แบบร่าง" },
  Submitted: { bg: "#FEF6D8", fg: "#9A7B06", label: "ยื่นแล้ว / รอตรวจสอบ" },
  Reviewed: { bg: "#EAE7FA", fg: "#5748B8", label: "ตรวจสอบแล้ว / รออนุมัติ" },
  Returned: { bg: "#FDEBDD", fg: "#B4531A", label: "ส่งกลับแก้ไข" },
  Approved: { bg: "#DFF5E6", fg: "#1E8E4F", label: "อนุมัติแล้ว" },
  Rejected: { bg: "#FBE2E2", fg: "#C23B3B", label: "ไม่อนุมัติ" },
  Cancelled: { bg: "#EDF0F2", fg: "#5B6672", label: "ยกเลิก" },
  Unknown: { bg: "#EDF0F2", fg: "#5B6672", label: "ไม่ทราบสถานะ" },
};