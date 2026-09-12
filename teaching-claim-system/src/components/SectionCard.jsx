import React, { useState } from "react";
import { C } from "../theme";

export default function SectionCard({ children, className = "", hoverable = true, ...props }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      {...props}
      className={`rounded-3xl border transition-all duration-300 ${className}`}
      style={{
        background: C.card,
        borderColor: hoverable && hovered ? C.teal : C.border,
        boxShadow: hoverable && hovered ? "0 18px 45px -18px rgba(37,99,235,0.28)" : "0 8px 30px -24px rgba(0,0,0,0.9)",
        transform: hoverable && hovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
    >
      {children}
    </div>
  );
}