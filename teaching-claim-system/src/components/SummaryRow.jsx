import React from "react";
import { C } from "../theme";

export default function SummaryRow({
  label,
  value,
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b pb-3 last:border-0"
      style={{
        borderColor: C.border,
      }}
    >
      <span
        className="text-sm"
        style={{
          color: C.sub,
        }}
      >
        {label}
      </span>

      <span
        className="text-sm font-semibold sm:text-right"
        style={{
          color: C.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}