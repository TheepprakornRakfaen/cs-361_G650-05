import React, { useState } from "react";
import { X, GraduationCap, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { C } from "../theme";

export default function LoginModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: เชื่อมต่อระบบยืนยันตัวตนจริงภายหลัง
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(30,41,59,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F2F6F8]"
          style={{ color: C.sub }}
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: C.roseSoft }}>
            <GraduationCap size={26} style={{ color: C.rose }} />
          </div>
          <h2 className="font-extrabold text-xl" style={{ color: C.ink }}>เข้าสู่ระบบ</h2>
          <p className="text-sm mt-1" style={{ color: C.sub }}>
            สำหรับอาจารย์ผู้สอนและผู้ช่วยสอน (TA)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: C.ink }}>
              อีเมล / รหัสผู้ใช้
            </label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
              style={{ borderColor: C.border, background: C.bg }}
            >
              <Mail size={16} style={{ color: C.sub }} className="shrink-0" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@tu.ac.th"
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: C.ink }}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: C.ink }}>
              รหัสผ่าน
            </label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
              style={{ borderColor: C.border, background: C.bg }}
            >
              <Lock size={16} style={{ color: C.sub }} className="shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: C.ink }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="shrink-0"
                style={{ color: C.sub }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end -mt-1">
            <button type="button" className="text-xs font-semibold" style={{ color: C.tealDark }}>
              ลืมรหัสผ่าน?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-sm text-white mt-1 transition-transform duration-150 active:scale-[0.98]"
            style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
          >
            เข้าสู่ระบบ
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: C.sub }}>
          พบปัญหาการเข้าสู่ระบบ ติดต่อเจ้าหน้าที่ดูแลระบบ
        </p>
      </div>
    </div>
  );
}
