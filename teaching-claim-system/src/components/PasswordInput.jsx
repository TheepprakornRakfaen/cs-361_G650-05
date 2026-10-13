import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { C } from "../theme";

export default function PasswordInput({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••",
  id,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-semibold mb-1.5 block"
        style={{ color: C.ink }}
      >
        {label}
      </label>

      <div
        className="flex items-center gap-2 rounded-xl px-3 py-3 border"
        style={{ borderColor: C.border, background: C.bg }}
      >
        <Lock size={16} style={{ color: C.sub }} className="shrink-0" />

        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="bg-transparent outline-none text-sm w-full"
          style={{ color: C.ink }}
        />

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="shrink-0"
          style={{ color: C.sub }}
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
