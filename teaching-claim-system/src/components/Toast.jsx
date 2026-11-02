import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { C } from "../theme";

/*
 * แจ้งเตือนแบบ Toast (ไม่บล็อกการทำงาน แทน alert() ของเบราว์เซอร์)
 *  - message  ข้อความ
 *  - type     "success" | "error" | "info"
 *  - duration เวลาปิดอัตโนมัติ (มิลลิวินาที) 0 = ไม่ปิดเอง
 *  - onClose  callback เมื่อปิด
 */
const TYPE_STYLE = {
  success: { bg: C.tealDark, icon: CheckCircle2 },
  error: { bg: C.rose, icon: AlertCircle },
  info: { bg: "#334155", icon: Info },
};

export default function Toast({
  message,
  type = "success",
  duration = 3600,
  onClose,
}) {
  useEffect(() => {
    if (!duration) return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose, message]);

  const { bg, icon: Icon } = TYPE_STYLE[type] || TYPE_STYLE.success;

  return (
    <div
      className="fixed bottom-6 right-6 z-[70] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-lg text-white max-w-sm"
      style={{ background: bg, animation: "fadein .2s ease" }}
      role={type === "error" ? "alert" : "status"}
    >
      <Icon size={20} className="shrink-0 mt-0.5" />
      <span className="text-sm font-medium whitespace-pre-line">{message}</span>
      <button
        onClick={onClose}
        className="opacity-80 hover:opacity-100 shrink-0 mt-0.5"
        aria-label="ปิด"
      >
        <X size={16} />
      </button>
    </div>
  );
}
