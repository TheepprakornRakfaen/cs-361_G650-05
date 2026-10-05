import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  XCircle,
  Users,
  Wallet,
  FileCheck2,
  FileText,
  ListChecks,
  CalendarClock,
  ClipboardList,
  Info,
  GraduationCap,
  UserCog,
  Presentation,
  UserCheck,
  Mic,
  UserPlus,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import Select from "../components/Select";
import HeroCarousel from "../components/HeroCarousel";
import { scrollToSection } from "../utils/scroll";
import { FAQS } from "../data/searchIndex";
import {
  SCOPE,
  USER_TYPES,
  TEACHING_RATE,
  TA_RATES,
  CONDITIONS,
  DOCUMENTS,
  RELATED_DOCUMENTS,
  PROCESS_STEPS,
  TIMING,
  TEACHER_FEATURES,
  STAFF_FEATURES,
} from "../data/infoData";

// สไตล์ต่อบทบาทในการ์ดสไลด์ของ "ผู้มีสิทธิ์ยื่นคำขอเบิก"
// key ตาม role เพื่อให้สี/ไอคอนของแต่ละบทบาทคงที่ ไม่ซ้ำกัน ไม่ผูกกับลำดับ
const ROLE_STYLES = {
  "อาจารย์ / ผู้สอน": {
    icon: GraduationCap,
    gradient: "linear-gradient(135deg, #7FD6E0, #4FB3D9)",
    image: "/images/roles/teacher.jpg",
  },

  "ผู้ช่วยสอน (TA)": {
    icon: UserCog,
    gradient: "linear-gradient(135deg, #FFD98A, #FFB45E)",
    image: "/images/roles/ta.jpg",
  },

  "อาจารย์ผู้รับผิดชอบวิชา": {
    icon: ShieldCheck,
    gradient: "linear-gradient(135deg, #BDB6FF, #8E9BFF)",
    image: "/images/roles/course-owner.jpg",
  },

  "อาจารย์ผู้บรรยาย": {
    icon: Presentation,
    gradient: "linear-gradient(135deg, #9CD0FF, #5DA9F0)",
    image: "/images/roles/lecturer.jpg",
  },

  "ผู้ช่วยกิจกรรม": {
    icon: UserPlus,
    gradient: "linear-gradient(135deg, #FFB8D2, #F58FB5)",
    image: "/images/roles/activity-assistant.jpg",
  },

  "ผู้ช่วยอาจารย์ผู้บรรยาย": {
    icon: Mic,
    gradient: "linear-gradient(135deg, #95E3C4, #52C7A0)",
    image: "/images/roles/lecturer-assistant.jpg",
  },
};

const DEFAULT_ROLE_STYLE = { icon: UserCheck, gradient: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` };

function SectionTitle({ icon: Icon, title, sub, accent = C.tealDark }) {
  return (
    <div className="mb-6 flex items-center gap-3.5">
      {/* ไอคอนในกล่องสี — ภาษาเดียวกับ PageHeader ของหน้าอื่น */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}1A` }}
      >
        <Icon size={19} style={{ color: accent }} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <h3
          className="font-bold text-lg md:text-xl tracking-tight leading-tight"
          style={{ color: C.ink }}
        >
          {title}
        </h3>
        {sub && (
          <p className="text-sm mt-1" style={{ color: C.sub }}>
            {sub}
          </p>
        )}
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

// ครอบเนื้อหาให้เต็มความกว้างพื้นที่เนื้อหา (เหมือนหน้าอื่น)
function Wrap({ children }) {
  return <div className="w-full">{children}</div>;
}

// แถบพื้นหลังเต็มความกว้างพื้นที่เนื้อหา — ไล่สีจางเข้าหาพื้นหลังหลักด้านบน/ล่าง
// เพื่อให้ต่อกับส่วนอื่นเนียน ไม่เป็นขอบแข็ง พร้อมลายจุดและวงกลมเบลอตกแต่ง
const BAND_THEMES = {
  sky: { plain: true }, // ไม่มีสีพื้นหลัง (เดิม: tint "#E3EEFB")
  violet: { tint: "#FFFFFF", image: "/dot.png", size: "1890px auto", pad: "pt-10 pb-7 md:pb-9" },
  mint: { tint: "#F3FDFF", image: "/grid.png", size: "1288px auto", pad: "py-6 md:py-8" },
};

function Band({ variant = "sky", children }) {
  const t = BAND_THEMES[variant] || BAND_THEMES.sky;

  // แถบที่ไม่มีพื้นหลัง — ใช้สีพื้นของหน้าตามปกติ
  if (t.plain) {
    return (
      <section className="relative my-4">
        <div className="relative w-full">{children}</div>
      </section>
    );
  }

  // แถบที่ใช้รูปเป็นพื้นหลัง (public/grid.png, public/dot.png)
  if (t.image) {
    return (
      <section
        className={`relative -mx-5 md:-mx-9 px-5 md:px-9 ${t.pad} my-4 overflow-hidden`}
        style={{
          backgroundColor: t.tint,
          backgroundImage: `url("${t.image}")`,
          backgroundSize: t.size, // ปรับขนาดลาย (ตาราง/จุด) ได้ที่ BAND_THEMES
          backgroundRepeat: "repeat",
          backgroundPosition: "top left",
        }}
      >
        <div className="relative w-full">{children}</div>
      </section>
    );
  }

  return (
    <section
      className="relative -mx-5 md:-mx-9 px-5 md:px-9 py-12 my-4 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${C.bg} 0%, ${t.tint} 16%, ${t.tint} 84%, ${C.bg} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-16 -left-20 w-80 h-80 rounded-full blur-3xl"
        style={{ background: t.blobA }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-16 w-96 h-96 rounded-full blur-3xl"
        style={{ background: t.blobB }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgba(30,86,135,0.14) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%)",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%)",
        }}
      />
      <div className="relative w-full">{children}</div>
    </section>
  );
}

// การ์ดสรุปรอบการยื่นที่เปิดรับอยู่ (ดึงจากข้อมูลรอบเดียวกับหน้าสร้างคำขอ)
function RoundStatus({ rounds }) {
  const openRounds = useMemo(() => {
    const seen = new Set();
    return rounds.filter((r) => {
      if (r.status !== "Open") return false;
      const key = `${r.label}|${r.period}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rounds]);

  const hasOpen = openRounds.length > 0;
  const shown = openRounds.slice(0, 2);

  return (
    <div
      className="rounded-2xl border bg-white p-4 md:p-5 w-full md:w-80 shrink-0"
      style={{ borderColor: C.border, boxShadow: "0 8px 22px rgba(30,86,135,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="relative flex w-2.5 h-2.5">
          {hasOpen && (
            <span
              className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping"
              style={{ background: "#1E8E4F" }}
            />
          )}
          <span
            className="relative inline-flex w-2.5 h-2.5 rounded-full"
            style={{ background: hasOpen ? "#1E8E4F" : C.sub }}
          />
        </span>
        <p className="text-xs font-bold" style={{ color: hasOpen ? "#1E8E4F" : C.sub }}>
          {hasOpen ? "รอบที่เปิดรับตอนนี้" : "ยังไม่มีรอบที่เปิดรับ"}
        </p>
      </div>

      {hasOpen ? (
        <ul className="space-y-2.5">
          {shown.map((r) => (
            <li key={`${r.label}|${r.period}`} className="flex items-start gap-2.5">
              <CalendarClock size={16} className="mt-0.5 shrink-0" style={{ color: C.tealDark }} />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-5" style={{ color: C.ink }}>
                  {r.label} · {r.period}
                </p>
                {r.deadline && (
                  <p className="text-xs mt-0.5" style={{ color: C.sub }}>
                    ส่งหลักฐานภายใน {r.deadline}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-5" style={{ color: C.sub }}>
          เมื่อมีรอบใหม่เปิดรับ ข้อมูลจะแสดงที่นี่
        </p>
      )}
    </div>
  );
}

// ===== ลูกเล่นหน้าแรก =====
// 1) ส่วนต่าง ๆ ค่อย ๆ เลื่อนขึ้นพร้อมเฟดเมื่อเลื่อนหน้าจอมาถึง
// 2) ปุ่มเมนูด่วนมีแถบสีเข้มกวาดเข้ามาจากซ้ายตอนเมาส์ชี้
// CSS อยู่ในตัวไฟล์นี้ ไม่ต้องแก้ index.css
const HOME_FX_CSS = `
.rv-hidden { opacity: 0; transform: translateY(40px); }
.rv-in { animation: rvUp 0.75s cubic-bezier(0.22, 0.61, 0.36, 1) backwards; }
@keyframes rvUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: none; }
}

.nav-sweep { position: relative; overflow: hidden; z-index: 0; }
.nav-sweep::before {
  content: "";
  position: absolute;
  inset: 0;
  background: ${C.tealDark};
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
  z-index: -1;
}
.nav-sweep:hover::before, .nav-sweep:focus-visible::before {
  transform: scaleX(1);
  transform-origin: left;
}
.nav-sweep { transition: color 0.3s ease; }
.nav-sweep:hover, .nav-sweep:focus-visible { color: #FFFFFF !important; }

@media (prefers-reduced-motion: reduce) {
  .rv-hidden { opacity: 1; transform: none; }
  .rv-in { animation: none; }
  .nav-sweep::before { transition: none; }
}
`;

const REVEAL_IDS = ["documents", "scope", "users", "rates", "conditions", "required-docs", "process", "timing", "faq", "features"];

function useScrollReveal() {
  useLayoutEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = REVEAL_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    els.forEach((el) => el.classList.add("rv-hidden"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.classList.remove("rv-hidden");
          el.classList.add("rv-in");
          el.addEventListener("animationend", () => el.classList.remove("rv-in"), { once: true });
          io.unobserve(el);
        });
      },
      { threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      els.forEach((el) => el.classList.remove("rv-hidden", "rv-in"));
    };
  }, []);
}

const QUICK_NAV = [
  ["documents", "ประกาศและเอกสาร"],
  ["scope", "ขอบเขตการเบิก"],
  ["users", "ผู้มีสิทธิ์"],
  ["rates", "อัตราค่าตอบแทน"],
  ["process", "วิธียื่นคำขอ"],
  ["faq", "คำถามที่พบบ่อย"],
];

export default function Home({ isLoggedIn = false, goCreate, onLogin, rounds = [] }) {
  const [openFaq, setOpenFaq] = useState(null);
  useScrollReveal();

  return (
    <div className="w-full">
      <style>{HOME_FX_CSS}</style>
      <Wrap>
      {/* Hero / Website Preview */}
      <div
        className="relative mb-14"
        style={{
          animation: "fadein 0.5s ease-out",
        }}
      >
        {/* พื้นที่สำหรับรูปภาพเว็บไซต์ — สไลด์เปลี่ยนรูปอัตโนมัติทุก 5 วิ + เลื่อนเองได้ */}
        <HeroCarousel
          images={[
            "/images/TU.jpg",
            // เพิ่มรูปเพิ่มเติมได้ตรงนี้ เช่น
            // "/images/hero-2.jpg",
            // "/images/hero-3.jpg",
          ]}
          alt="ภาพเว็บไซต์ระบบเบิกค่าตอบแทนการสอน"
        />



        {/* Quick navigation — ดึงขึ้นทับขอบล่างรูป TU ด้วย margin ลบ แทนตำแหน่ง absolute เดิมที่อิงความสูงของกริด */}
        <nav
          className="relative z-20 mx-auto w-[92%] md:w-[88%] -mt-5 sm:-mt-8 rounded-2xl border bg-white p-2.5 md:p-3"
          style={{
            borderColor: C.border,
            boxShadow: "0 12px 30px rgba(40,100,110,0.16)",
          }}
          aria-label="เมนูภายในหน้า"
        >
            {/* มือถือ: dropdown เดียวให้กดลูกศรลงเลือกเมนู แทนกริดที่แน่นเกินไป */}
            <div className="sm:hidden relative">
              <Select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) scrollToSection(id);
                }}
                aria-label="เลือกเมนูภายในหน้า"
                className="w-full rounded-xl pl-4 pr-3.5 py-3 text-sm font-semibold"
                style={{
                  background: C.tealSoft,
                  color: C.tealDark,
                  border: `1px solid ${C.border}`,
                }}
              >
                <option value="" disabled>
                  เลือกเมนู...
                </option>
                {QUICK_NAV.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            {/* sm ขึ้นไป: กริดเมนูด่วนแบบเดิม */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {QUICK_NAV.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(id);
                  }}
                  className="nav-sweep flex items-center justify-center min-h-12 rounded-xl px-3 py-2 whitespace-nowrap text-xs md:text-sm font-medium"
                  style={{
                    background: C.tealSoft,
                    color: C.tealDark,
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

        {/* ข้อมูลเว็บไซต์ใต้รูป */}
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="min-w-0">
            

              <h1
                className="text-2xl md:text-3xl font-extrabold mb-2"
                style={{ color: "#17343B" }}
              >
                ระบบเบิกค่าตอบแทนการสอน
              </h1>

              <p
                className="text-sm md:text-base leading-7 max-w-3xl"
                style={{ color: "#58727A" }}
              >
                ข้อมูลพื้นฐานเกี่ยวกับค่าตอบแทนการสอนและค่าตอบแทนที่เกี่ยวข้อง
                ทั้งประเภทค่าตอบแทน ผู้มีสิทธิ์ อัตราหรือหลักเกณฑ์ เงื่อนไข
                เอกสารประกอบ ขั้นตอน และช่วงเวลาที่เกี่ยวข้อง
              </p>

              {/* ปุ่มเรียกใช้งานหลัก */}
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => (isLoggedIn ? goCreate?.() : onLogin?.())}
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full font-bold text-sm text-white transition-transform hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
                    boxShadow: "0 8px 18px rgba(30,86,135,0.25)",
                  }}
                >
                  {isLoggedIn ? "เริ่มยื่นคำขอ" : "เข้าสู่ระบบเพื่อยื่นคำขอ"}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("process")}
                  className="inline-flex items-center justify-center h-11 px-6 rounded-full font-semibold text-sm border bg-white transition-colors hover:bg-[#E8F0FA]"
                  style={{ borderColor: C.border, color: C.tealDark }}
                >
                  ดูวิธียื่นคำขอ
                </button>
              </div>
            </div>

            <RoundStatus rounds={rounds} />
          </div>
        </div>
      </div>

     {/* เอกสารประกาศและระเบียบที่เกี่ยวข้อง */}
<div id="documents" className="mb-4 scroll-mt-6 -mt-9">

  <div className="space-y-3">
    {RELATED_DOCUMENTS.map((doc) => (
      <HoverCard
        key={doc.title}
        className="rounded-2xl p-4 border"
        baseBg="#FFFFFF"
      >
        <div className="flex items-start gap-3">

          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: C.tealSoft }}
          >
            <FileText
              size={18}
              style={{ color: C.tealDark }}
            />
          </div>

          {/* เนื้อหา */}
          <div className="flex-1 min-w-0">

            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: C.tealSoft,
                  color: C.tealDark,
                }}
              >
                {doc.type}
              </span>

              <span
                className="text-xs"
                style={{ color: C.sub }}
              >
                {doc.date}
              </span>
            </div>

            <p
              className="font-semibold text-sm leading-6"
              style={{ color: C.ink }}
            >
              {doc.title}
            </p>

            <p
              className="text-xs mt-1.5 leading-5"
              style={{ color: C.sub }}
            >
              {doc.description}
            </p>

            {/* ปุ่ม */}
            <div className="flex flex-wrap gap-2 mt-4">

              {/* เปิดหน้าเว็บมหาวิทยาลัย */}
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  background: C.teal,
                  color: "#FFFFFF",
                }}
              >
                ดูเอกสาร
              </a>

              {/* เปิด / ดาวน์โหลด PDF */}
              <a
                href={doc.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: C.border,
                  color: C.ink,
                  background: "#FFFFFF",
                }}
              >
                ดาวน์โหลด / เปิด PDF
              </a>

            </div>
          </div>
        </div>
      </HoverCard>
    ))}
  </div>
</div>
      {/* ขอบเขตการเบิก */}
      {(

        <section id="scope" className="scroll-mt-6 mb-8">
          <div className="px-1 mb-4">
            <SectionTitle icon={ClipboardList} title="ขอบเขตการเบิก" sub="สิ่งที่เบิกได้และเบิกไม่ได้ในระบบนี้" />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div
              className="rounded-2xl p-5"
              style={{
                background: "#F0FAF3",
                border: "1px solid #BFE2C9",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "#D9F2E0" }}
                >
                  <ShieldCheck size={17} style={{ color: "#23864A" }} />
                </div>
                <p className="font-bold text-sm" style={{ color: "#20663C" }}>
                  สิ่งที่สามารถเบิกได้
                </p>
              </div>
              <div className="space-y-3">
                {SCOPE.included.map((s, i) => (
                  <div
                    key={s.title}
                    className="flex items-start gap-3 pb-3"
                    style={{
                      borderBottom:
                        i < SCOPE.included.length - 1 ? "1px solid #D7EBDD" : "none",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: "#D9F2E0", color: "#23864A" }}
                    >
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                      <p className="text-xs mt-0.5 leading-5" style={{ color: C.sub }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{
                background: "#FFF6F6",
                border: "1px solid #E8C8CC",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "#F8E4E6" }}
                >
                  <XCircle size={17} style={{ color: C.rose }} />
                </div>
                <p className="font-bold text-sm" style={{ color: "#8D4A55" }}>
                  สิ่งที่ไม่สามารถเบิกได้
                </p>
              </div>
              <div className="space-y-3">
                {SCOPE.excluded.map((s, i) => (
                  <div
                    key={s.title}
                    className="flex items-start gap-3 pb-3"
                    style={{
                      borderBottom:
                        i < SCOPE.excluded.length - 1 ? "1px solid #F0DDE0" : "none",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: "#F8E4E6", color: C.rose }}
                    >
                      ×
                    </span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: C.ink }}>{s.title}</p>
                      <p className="text-xs mt-0.5 leading-5" style={{ color: C.sub }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      </Wrap>

      <Band variant="violet">
      {/* ผู้มีสิทธิ์ / ผู้ใช้งานหลัก */}
      {(
        <SectionCard id="users" className="scroll-mt-6 p-6 mb-0" hoverable={false}>
          <SectionTitle
            icon={Users}
            title="ผู้มีสิทธิ์ยื่นคำขอเบิก"
            sub="ผู้ใช้งานที่สามารถยื่นคำขอในระบบ"
            accent={C.violet}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {USER_TYPES.map((u, index) => {
              const style = ROLE_STYLES[u.role] || DEFAULT_ROLE_STYLE;

              return (
                <div
                  key={u.role}
                  className="group relative overflow-hidden rounded-[22px] transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "#F4F8F9",
                    boxShadow: "0 8px 24px rgba(31,75,82,0.07)",
                  }}
                >
                  {/* รูปภาพเต็มพื้นที่ด้านบน */}
                  <div
                    className="relative h-44 overflow-hidden"
                    style={{ background: style.gradient }}
                  >
                    {style.image ? (
                      <img
                        src={style.image}
                        alt={u.role}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    {/* ไอคอนใหญ่จาง ๆ ตกแต่งมุมการ์ด (ใช้เมื่อยังไม่มีรูป) */}
                    {React.createElement(style.icon, {
                      size: 110,
                      strokeWidth: 1.2,
                      className: "absolute -right-3 -top-3 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                      style: { color: "rgba(255,255,255,0.35)" },
                    })}

                    {/* gradient เพื่อให้ข้อความอ่านง่าย */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(20,55,100,0.42) 0%, rgba(20,55,100,0.05) 60%, rgba(255,255,255,0.10) 100%)",
                      }}
                    />

                    {/* ลำดับแบบ minimal */}
                    <span
                      className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.30)",
                        color: "#FFFFFF",
                        border: "1px solid rgba(255,255,255,0.5)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      0{index + 1}
                    </span>

                    {/* ชื่อบทบาทวางบนภาพ */}
                    <div className="absolute left-5 right-5 bottom-4">
                      <p className="font-bold text-base text-white leading-6" style={{ textShadow: "0 1px 6px rgba(15,50,100,0.45)" }}>
                        {u.role}
                      </p>
                    </div>
                  </div>

                  {/* รายละเอียดแบบเรียบ ไม่ทำเป็นการ์ดซ้อน */}
                  <div className="px-5 py-4 min-h-[92px] flex items-start">
                    <p
                      className="text-sm leading-6"
                      style={{ color: "#58727A" }}
                    >
                      {u.desc}
                    </p>
                  </div>

                  {/* เส้น accent เล็ก ๆ ตอน hover */}
                  <div
                    className="absolute left-5 right-5 bottom-0 h-0.5 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"
                    style={{ background: style.gradient }}
                  />
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      </Band>

      <Wrap>
      {/* อัตราค่าตอบแทน */}
      {(
        <SectionCard id="rates" className="scroll-mt-6 p-6 mb-8" hoverable={false}>
          <SectionTitle
            icon={Wallet}
            title="อัตราค่าตอบแทน"
            sub="อัตราหรือหลักเกณฑ์การจ่ายค่าตอบแทน"
          />

          {/* ค่าสอนอาจารย์ */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-sm font-semibold"
                style={{ color: C.ink }}
              >
                ค่าสอนอาจารย์
              </p>

            </div>

            <div
              className="rounded-2xl p-4 md:p-5"
              style={{
                background: "#F3FAFB",
                border: "1px solid #C8E3E7",
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x"
                style={{ borderColor: "#C8E3E7" }}
              >
                {TEACHING_RATE.values.map((v) => (
                  <div key={v} className="px-4 py-3 text-center">
                    <p className="text-xs mb-1.5" style={{ color: C.sub }}>
                      อัตราค่าตอบแทน
                    </p>
                    <p className="figure text-3xl md:text-4xl font-extrabold" style={{ color: C.tealDark }}>
                      {v.toLocaleString()}
                      <span className="text-xs font-semibold ml-1.5">บาท/ชม.</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p
              className="text-xs mt-3"
              style={{ color: C.sub }}
            >
              {TEACHING_RATE.note}
            </p>
          </div>

          {/* Divider */}
          <div
            className="h-px mb-7"
            style={{ background: C.border }}
          />

          {/* ค่า TA / ผู้ช่วยสอน */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-sm font-semibold"
                style={{ color: C.ink }}
              >
                ค่า TA / ผู้ช่วยสอน
              </p>

              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  background: C.violetSoft,
                  color: C.violet,
                }}
              >
                อัตราตามประเภท
              </span>
            </div>

            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: "#DCECEF", background: "#FFFFFF" }}
            >
              {TA_RATES.map((r, index) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-5 px-5 py-4"
                  style={{
                    background: index % 2 === 0 ? "#F8FBFC" : "#FFFFFF",
                    borderBottom:
                      index < TA_RATES.length - 1 ? "1px solid #E3EEF0" : "none",
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>
                      {r.label}
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.sub }}>
                      {r.who}
                    </p>
                  </div>

                  <p className="figure text-2xl font-extrabold text-right shrink-0" style={{ color: C.tealDark }}>
                    {r.rate}
                    <span className="text-xs font-semibold ml-1.5">บาท/ชม.</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* เงื่อนไข/หลักเกณฑ์ */}
      {(
        <section id="conditions" className="scroll-mt-6 mb-8 px-1">
          <SectionTitle icon={Info} title="เงื่อนไขและหลักเกณฑ์" accent={C.ember} />
          <div className="border-t" style={{ borderColor: C.border }}>
            {CONDITIONS.map((c, index) => (
              <HoverListItem
                key={c}
                className="flex items-start gap-3 py-3.5 border-b"
                style={{ borderColor: C.border }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                  style={{ background: C.teal }}
                />
                <span className="text-sm leading-6" style={{ color: C.ink }}>
                  {c}
                </span>
              </HoverListItem>
            ))}
          </div>
        </section>
      )}

      {/* เอกสารประกอบ */}
      {(
        <SectionCard
          id="required-docs"
          className="scroll-mt-6 p-6 mb-8 border-transparent"
          hoverable={false}
        >
          <SectionTitle
            icon={FileText}
            title="เอกสารประกอบการเบิก"
            sub="เอกสารที่ต้องเตรียมสำหรับการยื่นคำขอเบิก"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[DOCUMENTS.internal, DOCUMENTS.external].map((d) => (
              <HoverCard
                key={d.title}
                className="relative rounded-2xl p-5 border overflow-hidden"
                baseBg={d === DOCUMENTS.internal ? "#F4FAFB" : "#FAF9F7"}
                baseBorder={d === DOCUMENTS.internal ? "#8FC9D1" : "#D8D2C7"}
                hoverBorder={d === DOCUMENTS.internal ? "#4FA9B7" : "#B8A98F"}
              >
                <div className="flex items-center gap-3 mb-5 pl-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: C.tealSoft }}
                  >
                    <FileText
                      size={21}
                      style={{ color: C.tealDark }}
                    />
                  </div>

                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: C.ink }}
                    >
                      {d.title}
                    </p>

                    <p
                      className="text-xs mt-1"
                      style={{ color: C.sub }}
                    >
                      เอกสารที่ต้องใช้
                    </p>
                  </div>
                </div>

                <div className="space-y-0">
                  {d.items.map((it, index) => (
                    <div
                      key={it}
                      className="flex items-center gap-3 py-3"
                      style={{
                        borderBottom:
                          index < d.items.length - 1
                            ? `1px solid ${d === DOCUMENTS.internal ? "#DDECEF" : "#E7E1D8"}`
                            : "none",
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{
                          background:
                            d === DOCUMENTS.internal ? "#DDF2F4" : "#EEE9E1",
                          color:
                            d === DOCUMENTS.internal ? C.tealDark : "#8A7A63",
                        }}
                      >
                        ✓
                      </span>

                      <span
                        className="text-xs font-medium"
                        style={{ color: C.ink }}
                      >
                        {it}
                      </span>
                    </div>
                  ))}
                </div>
              </HoverCard>
            ))}
          </div>
        </SectionCard>
      )}

      </Wrap>

      <Band variant="mint">
      {/* ขั้นตอน */}
      {(
        <SectionCard id="process" className="scroll-mt-6 p-6 mb-0">
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

      </Band>

      <Wrap>
      {/* ช่วงเวลาที่เกี่ยวข้อง */}
      {(
        <SectionCard id="timing" className="scroll-mt-6 p-6 mb-8">
          <SectionTitle icon={CalendarClock} title="ช่วงเวลาที่เกี่ยวข้อง" />
          <HoverCard className="flex items-center gap-4 rounded-2xl p-4 border" baseBg={C.tealSoft} baseBorder={C.tealSoft}>
            <span className="px-4 py-2 rounded-full text-sm font-bold text-white shrink-0" style={{ background: C.tealDark }}>
              {TIMING.cycle}
            </span>
            <p className="text-sm" style={{ color: C.ink }}>{TIMING.desc}</p>
          </HoverCard>
        </SectionCard>
      )}

      </Wrap>

      <Band variant="sky">
      {/* FAQ */}
      <section id="faq" className="scroll-mt-6 mb-8">
        <SectionCard className="p-6 md:p-8" hoverable={false}>
          <SectionTitle
            icon={Info}
            title="คำถามที่พบบ่อย"
          />

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className="rounded-2xl border overflow-hidden transition-all duration-200"
                  style={{
                    borderColor: isOpen ? C.teal : C.border,
                    background: isOpen ? C.tealSoft : "#FFFFFF",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    style={{ color: "#17343B" }}
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-sm md:text-base">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={19}
                      className="shrink-0 transition-transform duration-200"
                      style={{
                        color: C.tealDark,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {isOpen && (
                    <div
                      className="px-5 pb-5 text-sm leading-6"
                      style={{ color: C.sub }}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </section>


      </Band>

      <Wrap>
      {/* ฟังก์ชันที่จะมีในระบบ */}
      <div id="features" className="scroll-mt-6 mb-0">
        <SectionTitle
          icon={Presentation}
          title="ระบบนี้ช่วยอะไรได้บ้าง"
          sub="ฟังก์ชันที่รองรับการใช้งานของแต่ละบทบาท"
        />
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { title: "สำหรับอาจารย์", icon: GraduationCap, accent: C.tealDark, items: TEACHER_FEATURES },
            { title: "สำหรับเจ้าหน้าที่", icon: UserCog, accent: C.violet, items: STAFF_FEATURES },
          ].map(({ title, icon: Icon, accent, items }) => (
            <SectionCard key={title} className="p-6" hoverable={false}>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: C.border }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${accent}1A` }}
                >
                  <Icon size={20} style={{ color: accent }} />
                </div>
                <p className="font-bold text-base" style={{ color: C.ink }}>{title}</p>
              </div>
              <ul className="space-y-1">
                {items.map((f) => (
                  <HoverListItem key={f} className="flex items-start gap-2.5 text-sm leading-6 px-2 py-1.5 -mx-2">
                    <CheckCircle2 size={17} className="mt-1 shrink-0" style={{ color: accent }} />
                    <span style={{ color: C.ink }}>{f}</span>
                  </HoverListItem>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      </div>

      </Wrap>
    </div>
  );
}