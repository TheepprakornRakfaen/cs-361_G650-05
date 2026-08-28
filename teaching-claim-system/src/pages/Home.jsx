import React from "react";
import {
  ShieldCheck,
  XCircle,
  Users,
  Wallet,
  FileCheck2,
  ListChecks,
  CalendarClock,
  ClipboardList,
  Info,
} from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import {
  SCOPE,
  USER_TYPES,
  TEACHING_RATE,
  TA_RATES,
  CONDITIONS,
  DOCUMENTS,
  PROCESS_STEPS,
  TIMING,
  TEACHER_FEATURES,
  STAFF_FEATURES,
} from "../data/infoData";

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: C.tealSoft }}
      >
        <Icon size={18} style={{ color: C.tealDark }} />
      </div>
      <div>
        <h3 className="font-bold text-lg" style={{ color: C.ink }}>{title}</h3>
        {sub && <p className="text-sm mt-0.5" style={{ color: C.sub }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div
        className="rounded-3xl p-8 text-white mb-8 relative overflow-hidden"
        style={{ background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})` }}
      >
        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 relative">ระบบเบิกค่าตอบแทนการสอน</h1>
        <p className="text-sm md:text-base opacity-90 max-w-2xl relative">
          ข้อมูลพื้นฐานเกี่ยวกับค่าตอบแทนการสอนและค่าตอบแทนที่เกี่ยวข้อง ทั้งประเภทค่าตอบแทน
          ผู้มีสิทธิ์ อัตราหรือหลักเกณฑ์ เงื่อนไข เอกสารประกอบ ขั้นตอน และช่วงเวลาที่เกี่ยวข้อง
        </p>
      </div>

      {/* ขอบเขตการเบิก */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={ClipboardList} title="ขอบเขตการเบิก" sub="สิ่งที่เบิกได้และเบิกไม่ได้ในระบบนี้" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            {SCOPE.included.map((s) => (
              <div key={s.title} className="flex items-start gap-3 rounded-2xl p-4 mb-3" style={{ background: "#DFF5E6" }}>
                <ShieldCheck size={18} style={{ color: "#1E8E4F" }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.sub }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            {SCOPE.excluded.map((s) => (
              <div key={s.title} className="flex items-start gap-3 rounded-2xl p-4 mb-3" style={{ background: C.roseSoft }}>
                <XCircle size={18} style={{ color: C.rose }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.sub }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ผู้มีสิทธิ์ / ผู้ใช้งานหลัก */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={Users} title="ผู้มีสิทธิ์ยื่นคำขอเบิก" />
        <div className="grid sm:grid-cols-2 gap-4">
          {USER_TYPES.map((u) => (
            <div key={u.role} className="rounded-2xl p-4 border" style={{ borderColor: C.border }}>
              <p className="font-semibold text-sm mb-1" style={{ color: C.ink }}>{u.role}</p>
              <p className="text-xs" style={{ color: C.sub }}>{u.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* อัตราค่าตอบแทน */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={Wallet} title="อัตราค่าตอบแทน" sub="อัตราหรือหลักเกณฑ์การจ่ายค่าตอบแทน" />

        <p className="text-sm font-semibold mb-2" style={{ color: C.ink }}>ค่าสอนอาจารย์</p>
        <div className="flex flex-wrap gap-3 mb-1">
          {TEACHING_RATE.values.map((v) => (
            <span key={v} className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: C.tealSoft, color: C.tealDark }}>
              {v.toLocaleString()} บาท/ชม.
            </span>
          ))}
        </div>
        <p className="text-xs mb-6" style={{ color: C.sub }}>{TEACHING_RATE.note}</p>

        <p className="text-sm font-semibold mb-3" style={{ color: C.ink }}>ค่า TA / ผู้ช่วยสอน</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {TA_RATES.map((r) => (
            <div key={r.label} className="rounded-2xl p-4 border flex items-center justify-between gap-3" style={{ borderColor: C.border }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: C.ink }}>{r.label}</p>
                <p className="text-xs mt-0.5" style={{ color: C.sub }}>{r.who}</p>
              </div>
              <span className="text-lg font-extrabold whitespace-nowrap" style={{ color: C.tealDark }}>
                {r.rate}<span className="text-xs font-semibold"> บาท/ชม.</span>
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* เงื่อนไข/หลักเกณฑ์ */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={Info} title="เงื่อนไขและหลักเกณฑ์" />
        <ul className="space-y-2.5">
          {CONDITIONS.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-sm" style={{ color: C.ink }}>
              <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: C.teal }} />
              {c}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* เอกสารประกอบ */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={FileCheck2} title="เอกสารประกอบการเบิก" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[DOCUMENTS.internal, DOCUMENTS.external].map((d) => (
            <div key={d.title} className="rounded-2xl p-4" style={{ background: C.bg }}>
              <p className="font-semibold text-sm mb-2" style={{ color: C.ink }}>{d.title}</p>
              <div className="flex flex-wrap gap-2">
                {d.items.map((it) => (
                  <span key={it} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border" style={{ borderColor: C.border, color: C.ink }}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ขั้นตอน */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={ListChecks} title="ขั้นตอนการยื่นและตรวจสอบคำขอเบิก" />
        <div className="space-y-4">
          {PROCESS_STEPS.map((s, i) => (
            <div key={s.title} className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` }}
              >
                {i + 1}
              </div>
              <div className={i < PROCESS_STEPS.length - 1 ? "pb-4 border-b w-full" : "w-full"} style={{ borderColor: C.border }}>
                <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                <p className="text-xs mt-0.5" style={{ color: C.sub }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ช่วงเวลาที่เกี่ยวข้อง */}
      <SectionCard className="p-6 mb-8">
        <SectionTitle icon={CalendarClock} title="ช่วงเวลาที่เกี่ยวข้อง" />
        <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: C.tealSoft }}>
          <span className="px-4 py-2 rounded-full text-sm font-bold text-white shrink-0" style={{ background: C.tealDark }}>
            {TIMING.cycle}
          </span>
          <p className="text-sm" style={{ color: C.ink }}>{TIMING.desc}</p>
        </div>
      </SectionCard>

      {/* ฟังก์ชันที่จะมีในระบบ */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <SectionCard className="p-6">
          <p className="font-bold text-sm mb-3" style={{ color: C.ink }}>สำหรับอาจารย์</p>
          <ul className="space-y-2">
            {TEACHER_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs" style={{ color: C.sub }}>
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                {f}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard className="p-6">
          <p className="font-bold text-sm mb-3" style={{ color: C.ink }}>สำหรับเจ้าหน้าที่</p>
          <ul className="space-y-2">
            {STAFF_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs" style={{ color: C.sub }}>
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                {f}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
