import React from "react";
import { C } from "../theme";

export default function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm border-b pb-3" style={{ borderColor: C.border }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span className="font-semibold text-right" style={{ color: C.ink }}>{value}</span>
    </div>
  );
}
