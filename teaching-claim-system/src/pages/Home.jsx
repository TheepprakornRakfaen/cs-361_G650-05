import React, { useState, useMemo } from "react";
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
  SearchX,
  GraduationCap,
  UserCog,
} from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import Carousel from "../components/Carousel";
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

// สไตล์ต่อบทบาทในการ์ดสไลด์ของ "ผู้มีสิทธิ์ยื่นคำขอเบิก"
const ROLE_STYLES = [
  { icon: GraduationCap, gradient: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` },
  { icon: UserCog, gradient: "linear-gradient(135deg, #F5A75A, #E07B39)" },
];

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

// การ์ดย่อยที่ hover แล้วมีเงา + ยกขึ้นเล็กน้อย + เปลี่ยนกรอบเป็นสีธีมของเว็บ
function HoverCard({ children, className = "", baseBg, hoverBg, baseBorder = C.border, hoverBorder = C.teal }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`transition-all duration-200 ${className}`}
      style={{
        background: hovered && hoverBg ? hoverBg : baseBg,
        borderColor: hovered ? hoverBorder : baseBorder,
        boxShadow: hovered ? "0 8px 20px -6px rgba(44,132,150,0.22)" : "none",
        transform: hovered ? "translateY(-2px)" : "none",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

// ป้าย/pill ที่ hover แล้วเข้มขึ้นและขยายเล็กน้อย
function HoverPill({ children, className = "", style }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      className={`transition-all duration-200 inline-block ${className}`}
      style={{
        ...style,
        transform: hovered ? "scale(1.06)" : "scale(1)",
        filter: hovered ? "brightness(0.95)" : "brightness(1)",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </span>
  );
}

// แถวขั้นตอนที่ hover แล้วพื้นหลังไฮไลต์เบา ๆ
function HoverRow({ children, className = "" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`transition-colors duration-200 rounded-2xl ${className}`}
      style={{ background: hovered ? C.tealSoft : "transparent", cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

// li ที่ hover แล้วพื้นหลังไฮไลต์เบา ๆ (ใช้แทน HoverRow ในบริบทของ <ul>)
function HoverListItem({ children, className = "" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <li
      className={`transition-colors duration-200 rounded-2xl list-none ${className}`}
      style={{ background: hovered ? C.tealSoft : "transparent", cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </li>
  );
}

// รวมข้อความทั้งหมดของแต่ละ section ไว้ค้นหา (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
function buildCorpus(...parts) {
  return JSON.stringify(parts).toLowerCase();
}

export default function Home({ query = "" }) {
  const q = query.trim().toLowerCase();
  const matches = (corpus) => q === "" || corpus.includes(q);

  const corpora = useMemo(
    () => ({
      scope: buildCorpus("ขอบเขตการเบิก", SCOPE),
      users: buildCorpus("ผู้มีสิทธิ์ยื่นคำขอเบิก", USER_TYPES),
      rates: buildCorpus("อัตราค่าตอบแทน", TEACHING_RATE, TA_RATES),
      conditions: buildCorpus("เงื่อนไขและหลักเกณฑ์", CONDITIONS),
      documents: buildCorpus("เอกสารประกอบการเบิก", DOCUMENTS),
      process: buildCorpus("ขั้นตอนการยื่นและตรวจสอบคำขอเบิก", PROCESS_STEPS),
      timing: buildCorpus("ช่วงเวลาที่เกี่ยวข้อง", TIMING),
      features: buildCorpus("สำหรับอาจารย์ สำหรับเจ้าหน้าที่", TEACHER_FEATURES, STAFF_FEATURES),
    }),
    []
  );

  const visible = {
    scope: matches(corpora.scope),
    users: matches(corpora.users),
    rates: matches(corpora.rates),
    conditions: matches(corpora.conditions),
    documents: matches(corpora.documents),
    process: matches(corpora.process),
    timing: matches(corpora.timing),
    features: matches(corpora.features),
  };

  const anyVisible = Object.values(visible).some(Boolean);

  return (
    <div className="max-w-7xl w-full">
      {/* Hero */}
      <div
        className="rounded-3xl p-8 text-white mb-8 relative overflow-hidden"
        style={{ background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})`, animation: "fadein 0.5s ease-out" }}
      >
        <div
          className="absolute -right-10 -top-16 w-64 h-64 rounded-full"
          style={{ background: "rgba(255,255,255,0.10)", animation: "floatSlow 7s ease-in-out infinite" }}
        />
        <div
          className="absolute right-24 bottom-0 w-24 h-24 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)", animation: "floatSlow 5s ease-in-out infinite 1s" }}
        />
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 relative">ระบบเบิกค่าตอบแทนการสอน</h1>
        <p className="text-sm md:text-base opacity-90 max-w-2xl relative">
          ข้อมูลพื้นฐานเกี่ยวกับค่าตอบแทนการสอนและค่าตอบแทนที่เกี่ยวข้อง ทั้งประเภทค่าตอบแทน
          ผู้มีสิทธิ์ อัตราหรือหลักเกณฑ์ เงื่อนไข เอกสารประกอบ ขั้นตอน และช่วงเวลาที่เกี่ยวข้อง
        </p>
      </div>

      {q !== "" && (
        <p className="text-sm mb-4" style={{ color: C.sub }}>
          ผลการค้นหาสำหรับ <span className="font-semibold" style={{ color: C.tealDark }}>"{query}"</span>
        </p>
      )}

      {!anyVisible && (
        <SectionCard className="p-10 mb-8 flex flex-col items-center text-center" hoverable={false}>
          <SearchX size={32} style={{ color: C.sub }} className="mb-3" />
          <p className="font-semibold text-sm" style={{ color: C.ink }}>ไม่พบข้อมูลที่ตรงกับคำค้นหา</p>
          <p className="text-xs mt-1" style={{ color: C.sub }}>ลองค้นหาด้วยคำอื่น เช่น "อัตรา" "เอกสาร" หรือ "ขั้นตอน"</p>
        </SectionCard>
      )}

      {/* ขอบเขตการเบิก */}
      {visible.scope && (
        <SectionCard className="p-6 mb-8">
          <SectionTitle icon={ClipboardList} title="ขอบเขตการเบิก" sub="สิ่งที่เบิกได้และเบิกไม่ได้ในระบบนี้" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {SCOPE.included.map((s) => (
                <HoverCard key={s.title} className="flex items-start gap-3 rounded-2xl p-4 mb-3 border" baseBg="#DFF5E6" hoverBorder="#1E8E4F">
                  <ShieldCheck size={18} style={{ color: "#1E8E4F" }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.sub }}>{s.desc}</p>
                  </div>
                </HoverCard>
              ))}
            </div>
            <div>
              {SCOPE.excluded.map((s) => (
                <HoverCard key={s.title} className="flex items-start gap-3 rounded-2xl p-4 mb-3 border" baseBg={C.roseSoft} hoverBorder={C.rose}>
                  <XCircle size={18} style={{ color: C.rose }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.sub }}>{s.desc}</p>
                  </div>
                </HoverCard>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ผู้มีสิทธิ์ / ผู้ใช้งานหลัก */}
      {visible.users && (
        <SectionCard className="p-6 mb-8" hoverable={false}>
          <SectionTitle icon={Users} title="ผู้มีสิทธิ์ยื่นคำขอเบิก" sub="ลากหรือกดลูกศรเพื่อดูแต่ละบทบาท" />
          <Carousel>
            {USER_TYPES.map((u, i) => {
              const style = ROLE_STYLES[i % ROLE_STYLES.length];
              const RoleIcon = style.icon;
              return (
                <div
                  key={u.role}
                  className="snap-start shrink-0 w-[230px] sm:w-[260px] rounded-3xl overflow-hidden border bg-white transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl"
                  style={{ borderColor: C.border }}
                >
                  <div
                    className="h-28 flex items-center justify-center relative overflow-hidden"
                    style={{ background: style.gradient }}
                  >
                    <div className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                    <div className="absolute -left-4 -top-6 w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
                    <RoleIcon size={34} className="text-white relative" />
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm mb-1.5" style={{ color: C.ink }}>{u.role}</p>
                    <p className="text-xs leading-relaxed" style={{ color: C.sub }}>{u.desc}</p>
                  </div>
                </div>
              );
            })}
          </Carousel>
        </SectionCard>
      )}

      {/* อัตราค่าตอบแทน */}
      {visible.rates && (
        <SectionCard className="p-6 mb-8">
          <SectionTitle icon={Wallet} title="อัตราค่าตอบแทน" sub="อัตราหรือหลักเกณฑ์การจ่ายค่าตอบแทน" />

          <p className="text-sm font-semibold mb-2" style={{ color: C.ink }}>ค่าสอนอาจารย์</p>
          <div className="flex flex-wrap gap-3 mb-1">
            {TEACHING_RATE.values.map((v) => (
              <HoverPill key={v} className="px-4 py-2 rounded-xl font-bold text-sm" style={{ background: C.tealSoft, color: C.tealDark }}>
                {v.toLocaleString()} บาท/ชม.
              </HoverPill>
            ))}
          </div>
          <p className="text-xs mb-6" style={{ color: C.sub }}>{TEACHING_RATE.note}</p>

          <p className="text-sm font-semibold mb-3" style={{ color: C.ink }}>ค่า TA / ผู้ช่วยสอน</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {TA_RATES.map((r) => (
              <HoverCard key={r.label} className="rounded-2xl p-4 border flex items-center justify-between gap-3" baseBg="#FFFFFF">
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.ink }}>{r.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.sub }}>{r.who}</p>
                </div>
                <span className="text-lg font-extrabold whitespace-nowrap" style={{ color: C.tealDark }}>
                  {r.rate}<span className="text-xs font-semibold"> บาท/ชม.</span>
                </span>
              </HoverCard>
            ))}
          </div>
        </SectionCard>
      )}

      {/* เงื่อนไข/หลักเกณฑ์ */}
      {visible.conditions && (
        <SectionCard className="p-6 mb-8">
          <SectionTitle icon={Info} title="เงื่อนไขและหลักเกณฑ์" />
          <ul className="space-y-2.5">
            {CONDITIONS.map((c) => (
              <HoverListItem key={c} className="flex items-start gap-2.5 text-sm px-2 py-1.5 -mx-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: C.teal }} />
                <span style={{ color: C.ink }}>{c}</span>
              </HoverListItem>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* เอกสารประกอบ */}
      {visible.documents && (
        <SectionCard className="p-6 mb-8">
          <SectionTitle icon={FileCheck2} title="เอกสารประกอบการเบิก" />
          <div className="grid sm:grid-cols-2 gap-4">
            {[DOCUMENTS.internal, DOCUMENTS.external].map((d) => (
              <HoverCard key={d.title} className="rounded-2xl p-4 border" baseBg={C.bg} baseBorder={C.bg}>
                <p className="font-semibold text-sm mb-2" style={{ color: C.ink }}>{d.title}</p>
                <div className="flex flex-wrap gap-2">
                  {d.items.map((it) => (
                    <HoverPill key={it} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border" style={{ borderColor: C.border, color: C.ink }}>
                      {it}
                    </HoverPill>
                  ))}
                </div>
              </HoverCard>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ขั้นตอน */}
      {visible.process && (
        <SectionCard className="p-6 mb-8">
          <SectionTitle icon={ListChecks} title="ขั้นตอนการยื่นและตรวจสอบคำขอเบิก" />
          <div className="space-y-1">
            {PROCESS_STEPS.map((s, i) => (
              <HoverRow key={s.title} className="px-3 py-3 -mx-3">
                <div className="flex items-start gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` }}
                  >
                    {i + 1}
                  </div>
                  <div className={i < PROCESS_STEPS.length - 1 ? "pb-3 border-b w-full" : "w-full"} style={{ borderColor: C.border }}>
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.sub }}>{s.desc}</p>
                  </div>
                </div>
              </HoverRow>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ช่วงเวลาที่เกี่ยวข้อง */}
      {visible.timing && (
        <SectionCard className="p-6 mb-8">
          <SectionTitle icon={CalendarClock} title="ช่วงเวลาที่เกี่ยวข้อง" />
          <HoverCard className="flex items-center gap-4 rounded-2xl p-4 border" baseBg={C.tealSoft} baseBorder={C.tealSoft}>
            <span className="px-4 py-2 rounded-full text-sm font-bold text-white shrink-0" style={{ background: C.tealDark }}>
              {TIMING.cycle}
            </span>
            <p className="text-sm" style={{ color: C.ink }}>{TIMING.desc}</p>
          </HoverCard>
        </SectionCard>
      )}

      {/* ฟังก์ชันที่จะมีในระบบ */}
      {visible.features && (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <SectionCard className="p-6">
            <p className="font-bold text-sm mb-3" style={{ color: C.ink }}>สำหรับอาจารย์</p>
            <ul className="space-y-1">
              {TEACHER_FEATURES.map((f) => (
                <HoverListItem key={f} className="flex items-start gap-2 text-xs px-2 py-1.5 -mx-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                  <span style={{ color: C.sub }}>{f}</span>
                </HoverListItem>
              ))}
            </ul>
          </SectionCard>
          <SectionCard className="p-6">
            <p className="font-bold text-sm mb-3" style={{ color: C.ink }}>สำหรับเจ้าหน้าที่</p>
            <ul className="space-y-1">
              {STAFF_FEATURES.map((f) => (
                <HoverListItem key={f} className="flex items-start gap-2 text-xs px-2 py-1.5 -mx-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                  <span style={{ color: C.sub }}>{f}</span>
                </HoverListItem>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
