import React from "react";
import { C } from "../theme";

export default function SectionCard({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-3xl border ${className}`} style={{ borderColor: C.border }}>
      {children}
    </div>
  );
}
