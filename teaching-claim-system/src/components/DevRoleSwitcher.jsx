import React, { useState } from "react";
import { FlaskConical, ChevronUp, Check } from "lucide-react";
import {
  DEV_ROLE_OPTIONS,
  DEV_TEST_ACCOUNT_OPTIONS,
  startDevSession,
  getDevRole,
} from "../services/devAuth";

/*
 * ปุ่มสลับบทบาทในโหมดทดลอง — มุมล่างขวา แสดงเฉพาะผู้ใช้ทดลอง
 * กดแล้วเปลี่ยนเป็นบทบาทนั้นทันที ไม่ต้องออกจากระบบแล้วเข้าใหม่
 */
export default function DevRoleSwitcher({ user, onSwitch }) {
  const [open, setOpen] = useState(false);

  if (!user?.isDevUser) return null;

  const options = [...DEV_ROLE_OPTIONS, ...DEV_TEST_ACCOUNT_OPTIONS];
  const current = getDevRole() || user.roleKey;

  const pick = (role) => {
    setOpen(false);
    if (role === current) return;
    onSwitch?.(startDevSession(role));
  };

  return (
    <div className="no-print fixed bottom-4 right-4 z-40 flex flex-col items-end text-xs">
      {open && (
        <div
          className="mb-2 w-56 rounded-xl border bg-white p-1.5 shadow-lg"
          style={{ borderColor: "#F0B37E" }}
        >
          {options.map(({ role, label }) => (
            <button
              key={role}
              type="button"
              onClick={() => pick(role)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-semibold hover:bg-[#FDEBDD]"
              style={{ color: "#B4531A" }}
            >
              {label}
              {role === current && <Check size={14} />}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border bg-[#FFF8F1] px-3 py-2 font-bold shadow"
        style={{ borderColor: "#F0B37E", color: "#B4531A" }}
        aria-expanded={open}
      >
        <FlaskConical size={14} />
        ทดลอง: {user.role}
        <ChevronUp
          size={14}
          className={`transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}

