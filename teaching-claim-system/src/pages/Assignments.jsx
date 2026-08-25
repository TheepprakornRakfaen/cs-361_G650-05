import React from "react";
import { ArrowRight } from "lucide-react";
import { C } from "../theme";
import { COURSES } from "../data/mockData";
import SectionCard from "../components/SectionCard";

export default function Assignments({ goCreateFor }) {
  return (
    <div className="max-w-5xl">
      <h2 className="text-xl font-extrabold mb-1" style={{ color: C.ink }}>งานสอนของฉัน</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>
        ภาคการศึกษา 1/2569 · ชั่วโมงสอนสูงสุด 45 ชั่วโมง / รายวิชา / ภาคการศึกษา
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        {COURSES.map((c) => {
          const pct = Math.min(100, Math.round((c.used / c.quota) * 100));
          return (
            <SectionCard key={c.code} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-extrabold text-lg" style={{ color: C.ink }}>{c.code}</p>
                  <p className="text-sm" style={{ color: C.sub }}>{c.name}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0" style={{ background: C.tealSoft, color: C.tealDark }}>
                  ฿{c.rate}/ชม.
                </span>
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: C.sub }}>
                <span>ใช้ไปแล้ว {c.used} ชม.</span>
                <span>คงเหลือ {c.quota - c.used} ชม.</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#EEF2F5] overflow-hidden mb-4">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 85 ? C.rose : C.teal }} />
              </div>

              <button onClick={() => goCreateFor(c.code)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.tealDark }}>
                สร้างคำขอสำหรับวิชานี้ <ArrowRight size={15} />
              </button>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
