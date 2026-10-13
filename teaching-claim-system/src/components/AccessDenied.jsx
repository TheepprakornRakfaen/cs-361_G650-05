import React from "react";
import { ShieldAlert } from "lucide-react";
import { C } from "../theme";
import SectionCard from "./SectionCard";

/*
 * [V3] หน้า/กล่องแจ้งว่าไม่มีสิทธิ์เข้าถึง (403)
 */
export default function AccessDenied({
  title = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
  description = "บัญชีของคุณไม่ได้รับสิทธิ์ใช้งานส่วนนี้ หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ",
  onBack,
  backLabel = "กลับหน้าแรก",
}) {
  return (
    <SectionCard
      hoverable={false}
      className="p-10 md:p-14 text-center max-w-xl mx-auto mt-8"
      role="alert"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: C.roseSoft }}
      >
        <ShieldAlert size={26} style={{ color: C.rose }} />
      </div>

      <h2 className="text-lg font-extrabold" style={{ color: C.ink }}>
        {title}
      </h2>

      <p className="text-sm mt-2 leading-6" style={{ color: C.sub }}>
        {description}
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
          }}
        >
          {backLabel}
        </button>
      )}
    </SectionCard>
  );
}
