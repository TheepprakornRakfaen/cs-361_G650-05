import React from "react";
import { Lock } from "lucide-react";
import { C } from "../theme";

/*
 * [V3] แสดงค่าแทนด้วยป้าย "จำกัดสิทธิ์" เมื่อผู้ใช้ไม่มีสิทธิ์ดูข้อมูลนั้น
 *
 * allowed=false หรือ value เป็น null/undefined → ไม่ render ค่าจริงเลย
 * (ไม่ใช้ blur/CSS ซ่อน เพราะค่ายังอยู่ใน DOM ได้)
 */
export default function Restricted({
  allowed = true,
  value,
  children,
  label = "จำกัดสิทธิ์",
  className = "",
}) {
  if (!allowed || value === null || value === undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${className}`}
        style={{ color: C.sub }}
        title="คุณไม่มีสิทธิ์ดูข้อมูลส่วนนี้"
      >
        <Lock size={12} />
        {label}
      </span>
    );
  }

  return <>{children ?? value}</>;
}
