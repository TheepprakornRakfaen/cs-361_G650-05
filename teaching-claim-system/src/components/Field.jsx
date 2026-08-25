import React from "react";
import { AlertTriangle } from "lucide-react";
import { C } from "../theme";

export default function Field({ label, required, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5" style={{ color: C.ink }}>
        {label} {required && <span style={{ color: C.rose }}>*</span>}
      </span>
      {children}
      {error && (
        <span className="text-xs mt-1 flex items-center gap-1" style={{ color: C.rose }}>
          <AlertTriangle size={12} />
          {error}
        </span>
      )}
    </label>
  );
}
