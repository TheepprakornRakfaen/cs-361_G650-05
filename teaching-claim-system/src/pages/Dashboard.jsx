import React, { useMemo } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { C, USER_FIRST } from "../theme";
import { ROUNDS } from "../data/mockData";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";

export default function Dashboard({ claims, goCreate, goDetail }) {
  const counts = useMemo(() => {
    const c = { Draft: 0, Pending: 0, Approved: 0, Rejected: 0 };
    claims.forEach((cl) => (c[cl.status] = (c[cl.status] || 0) + 1));
    return c;
  }, [claims]);

  const recent = claims.slice(0, 4);
  const openRound = ROUNDS.find((r) => r.status === "Open");

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-semibold" style={{ color: C.ink }}>ภาคการศึกษา 1/2569</span>
        <ChevronDown size={16} style={{ color: C.sub }} />
      </div>

      <div
        className="rounded-3xl p-8 text-white mb-8 relative overflow-hidden"
        style={{ background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})` }}
      >
        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
        <p className="text-lg font-semibold mb-6 relative">{USER_FIRST} สบายดี</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
          {[
            ["ทั้งหมด", claims.length],
            ["แบบร่าง", counts.Draft],
            ["รอตรวจสอบ", counts.Pending],
            ["อนุมัติแล้ว", counts.Approved],
          ].map(([label, val]) => (
            <div key={label} className="rounded-2xl px-5 py-4" style={{ background: "rgba(255,255,255,0.16)" }}>
              <p className="text-sm opacity-90">{label}</p>
              <p className="text-3xl font-extrabold mt-1">{val}</p>
            </div>
          ))}
        </div>
      </div>

      <h3 className="font-bold mb-3" style={{ color: C.ink }}>รอบการยื่นปัจจุบัน</h3>
      {openRound && (
        <SectionCard className="p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-lg" style={{ color: C.ink }}>{openRound.label}</p>
            <p className="text-sm mt-1" style={{ color: C.sub }}>{openRound.period}</p>
            <p className="text-sm" style={{ color: C.sub }}>ส่งหลักฐานภายใน {openRound.deadline}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: "#DFF5E6", color: "#1E8E4F" }}>เปิดรับ</span>
            <button
              onClick={goCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm"
              style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
            >
              สร้างคำขอ <Plus size={16} />
            </button>
          </div>
        </SectionCard>
      )}

      <h3 className="font-bold mb-3" style={{ color: C.ink }}>คำขอล่าสุด</h3>
      <SectionCard className="divide-y" style={{ borderColor: C.border }}>
        {recent.map((cl) => (
          <button
            key={cl.id}
            onClick={() => goDetail(cl.id)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#F8FBFC] first:rounded-t-3xl last:rounded-b-3xl"
          >
            <div className="flex items-center gap-4">
              <span className="font-bold w-16" style={{ color: C.ink }}>{cl.courseCode}</span>
              <span className="text-sm" style={{ color: C.sub }}>{cl.month.split(" ")[0]}</span>
              <span className="text-sm" style={{ color: C.sub }}>{cl.hours} ชม.</span>
            </div>
            <StatusPill status={cl.status} />
          </button>
        ))}
      </SectionCard>
    </div>
  );
}
