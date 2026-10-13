import React from "react";
import { SearchX } from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";

/*
 * [V3] หน้า 404 — ไม่พบหน้าที่ต้องการ
 */
export default function NotFound({ onBack }) {
  return (
    <SectionCard
      hoverable={false}
      className="p-10 md:p-14 text-center max-w-xl mx-auto mt-8"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: C.tealSoft }}
      >
        <SearchX size={26} style={{ color: C.tealDark }} />
      </div>

      <p className="text-xs font-bold tracking-widest" style={{ color: C.sub }}>
        404
      </p>

      <h2 className="text-lg font-extrabold mt-1" style={{ color: C.ink }}>
        ไม่พบหน้าที่คุณต้องการ
      </h2>

      <p className="text-sm mt-2 leading-6" style={{ color: C.sub }}>
        หน้านี้อาจถูกย้ายหรือไม่มีอยู่ในระบบ
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{
          background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
        }}
      >
        กลับหน้าแรก
      </button>
    </SectionCard>
  );
}
