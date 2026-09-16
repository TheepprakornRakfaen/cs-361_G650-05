import React from "react";
import { C, STATUS_STYLE } from "../theme";

export default function StatusPill({
  status,
}) {
  const style =
    STATUS_STYLE?.[status] || {
      bg: C.tealSoft,
      fg: C.tealDark,
      label: status || "ไม่ระบุ",
    };

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{
        background: style.bg,
        color: style.fg,
      }}
    >
      {style.label}
    </span>
  );
}