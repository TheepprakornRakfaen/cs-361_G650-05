import React from "react";
import { STATUS_STYLE } from "../theme";

export default function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
