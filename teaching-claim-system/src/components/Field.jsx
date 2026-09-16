import React from "react";
import { C } from "../theme";

export default function Field({
  label,
  required = false,
  error,
  children,
}) {
  return (
    <label className="block">
      <div
        className="flex items-center gap-1 text-sm font-semibold mb-2"
        style={{
          color: C.ink,
        }}
      >
        <span>{label}</span>

        {required && (
          <span
            style={{
              color: C.rose,
            }}
          >
            *
          </span>
        )}
      </div>

      {children}

      {error && (
        <p
          className="text-xs mt-1.5"
          style={{
            color: C.rose,
          }}
        >
          {error}
        </p>
      )}
    </label>
  );
}