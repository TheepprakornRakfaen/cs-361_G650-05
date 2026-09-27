import React, { useState } from "react";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  Wallet,
  FileCheck2,
} from "lucide-react";
import { C } from "../theme";

const FEATURES = [
  { icon: Wallet, text: "ยื่นคำขอเบิกค่าสอนได้ทุกที่ ทุกเวลา" },
  { icon: FileCheck2, text: "ติดตามสถานะคำขอแบบเรียลไทม์" },
  { icon: ShieldCheck, text: "ข้อมูลปลอดภัย เข้าถึงได้เฉพาะผู้มีสิทธิ์" },
];

export default function Login({ onBack, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: เชื่อมต่อระบบยืนยันตัวตนจริงภายหลัง
    onLoginSuccess && onLoginSuccess();
  };

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row" style={{ background: C.card }}>
      {/* ===== Left / Branding panel ===== */}
      <div
        className="relative hidden md:flex md:w-1/2 lg:w-[45%] flex-col justify-between p-12 lg:p-16 overflow-hidden shrink-0"
        style={{
          background: `linear-gradient(160deg, ${C.tealDark}, ${C.teal})`,
        }}
      >
        {/* ลวดลายตกแต่งพื้นหลัง */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="pointer-events-none absolute bottom-[-4rem] left-[-3rem] w-72 h-72 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors w-fit"
        >
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white/70"
          >
            <ArrowLeft size={16} />
          </span>
          กลับสู่หน้าแรก
        </button>

        <div className="relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <GraduationCap size={32} color="#FFFFFF" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-snug">
            ระบบเบิกค่าตอบแทนการสอน
          </h1>
          <p className="text-white/80 text-sm mt-3 max-w-sm leading-relaxed">
            พื้นที่สำหรับอาจารย์ผู้สอนและผู้ช่วยสอน (TA) ในการยื่น ติดตาม
            และจัดการคำขอเบิกค่าตอบแทนการสอนทั้งหมดในที่เดียว
          </p>

          <div className="flex flex-col gap-4 mt-10">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <Icon size={16} color="#FFFFFF" />
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          © 2569 มหาวิทยาลัยธรรมศาสตร์
        </p>
      </div>

      {/* ===== Right / Form panel ===== */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar เล็ก ๆ สำหรับจอมือถือ */}
        <div className="flex items-center justify-between px-5 md:px-12 h-20 shrink-0 md:hidden">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center border-2"
            style={{ color: C.ink, borderColor: C.border }}
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-semibold" style={{ color: C.ink }}>
            ระบบเบิกค่าสอน
          </span>
          <div className="w-10" />
        </div>

        <div className="hidden md:flex justify-end px-12 pt-10">
          <button
            onClick={onBack}
            className="text-sm font-semibold"
            style={{ color: C.sub }}
          >
            กลับสู่หน้าแรก
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-8">
          <div className="w-full max-w-sm">
            <div className="flex flex-col mb-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-5 md:hidden"
                style={{ background: C.roseSoft }}
              >
                <GraduationCap size={26} style={{ color: C.rose }} />
              </div>
              <h2 className="font-extrabold text-2xl" style={{ color: C.ink }}>
                เข้าสู่ระบบ
              </h2>
              <p className="text-sm mt-1.5" style={{ color: C.sub }}>
                สำหรับอาจารย์ผู้สอนและผู้ช่วยสอน (TA)
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: C.ink }}
                >
                  อีเมล / รหัสผู้ใช้
                </label>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-3 border"
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
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: C.ink }}
                >
                  รหัสผ่าน
                </label>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-3 border"
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
                <button
                  type="button"
                  className="text-xs font-semibold"
                  style={{ color: C.tealDark }}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white mt-1 transition-transform duration-150 active:scale-[0.98]"
                style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
              >
                เข้าสู่ระบบ
              </button>
            </form>

            <p className="text-xs text-center mt-8" style={{ color: C.sub }}>
              พบปัญหาการเข้าสู่ระบบ ติดต่อเจ้าหน้าที่ดูแลระบบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}