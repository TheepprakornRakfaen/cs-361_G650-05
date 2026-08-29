import React, { useState } from "react";
import { C } from "../theme";

export default function SectionCard({ children, className = "", hoverable = true }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-200 ${className}`}
      style={{
        borderColor: hoverable && hovered ? C.teal : C.border,
        boxShadow: hoverable && hovered ? "0 12px 28px -8px rgba(63,166,187,0.25)" : "none",
        transform: hoverable && hovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
    >
      {children}
    </div>
  );
}
