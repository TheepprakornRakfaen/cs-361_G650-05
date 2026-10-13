import React from "react";
import { ROLE_META } from "../data/roles";

export default function RoleBadge({ roleKey, label }) {
  const meta = ROLE_META[roleKey];

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        background: meta?.bg || "#EDF0F2",
        color: meta?.fg || "#5B6672",
      }}
    >
      {label || meta?.label || "ผู้ใช้งานระบบ"}
    </span>
  );
}
