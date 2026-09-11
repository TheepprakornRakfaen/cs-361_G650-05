import React, { useState, useMemo } from "react";
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
  SearchX,
  Presentation,
  UserCheck,
  Mic,
  UserPlus,
  ChevronDown,
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
    gradient: "linear-gradient(135deg, #8FC9CF, #5FA8B2)",
    image: "/images/roles/teacher.jpg",
  },

  "ผู้ช่วยสอน (TA)": {
    icon: UserCog,
    gradient: "linear-gradient(135deg, #D9BE92, #B89563)",
    image: "/images/roles/ta.jpg",
  },

  "อาจารย์ผู้รับผิดชอบวิชา": {
    icon: ShieldCheck,
    gradient: "linear-gradient(135deg, #AAA7D2, #7F7BB0)",
    image: "/images/roles/course-owner.jpg",
  },

  "อาจารย์ผู้บรรยาย": {
    icon: Presentation,
    gradient: "linear-gradient(135deg, #91B6CF, #668FAA)",
    image: "/images/roles/lecturer.jpg",
  },

  "ผู้ช่วยกิจกรรม": {
    icon: UserPlus,
    gradient: "linear-gradient(135deg, #C79DAF, #9E7388)",
    image: "/images/roles/activity-assistant.jpg",
  },

  "ผู้ช่วยอาจารย์ผู้บรรยาย": {
    icon: Mic,
    gradient: "linear-gradient(135deg, #8BBEAD, #609785)",
    image: "/images/roles/lecturer-assistant.jpg",
  },
};

const DEFAULT_ROLE_STYLE = { icon: UserCheck, gradient: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` };

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

const FAQS = [
  {
    question: "ใครสามารถยื่นคำขอเบิกค่าตอบแทนการสอนได้บ้าง?",
    answer: "ผู้มีสิทธิ์ยื่นคำขอเบิกสามารถตรวจสอบได้จากส่วนผู้มีสิทธิ์ยื่นคำขอเบิก โดยระบบจะแยกบทบาทและรายละเอียดของผู้ใช้งานแต่ละประเภทไว้อย่างชัดเจน",
  },
  {
    question: "ต้องเตรียมเอกสารอะไรบ้างก่อนยื่นคำขอ?",
    answer: "สามารถตรวจสอบรายการเอกสารที่ต้องใช้ได้จากส่วนเอกสารประกอบการเบิก ซึ่งแยกข้อมูลที่เกี่ยวข้องไว้ให้ตรวจสอบก่อนเริ่มยื่นคำขอ",
  },
  {
    question: "ขั้นตอนการยื่นและตรวจสอบคำขอเป็นอย่างไร?",
    answer: "เริ่มจากตรวจสอบสิทธิ์และข้อมูลที่เกี่ยวข้อง เตรียมเอกสาร จากนั้นยื่นคำขอและติดตามสถานะตามขั้นตอนที่ระบบกำหนด",
  },
  {
    question: "สามารถตรวจสอบอัตราค่าตอบแทนได้ที่ไหน?",
    answer: "ดูรายละเอียดได้จากหัวข้ออัตราค่าตอบแทน ซึ่งรวบรวมอัตราค่าสอนอาจารย์และอัตราสำหรับ TA / ผู้ช่วยสอน",
  },
  {
    question: "หากไม่พบข้อมูลที่ต้องการควรทำอย่างไร?",
    answer: "สามารถใช้ช่องค้นหาด้านบนเพื่อค้นหาคำว่า อัตรา เอกสาร ขั้นตอน หรือหัวข้อที่เกี่ยวข้องกับสิ่งที่ต้องการตรวจสอบ",
  },
];

export default function Home({ query = "" }) {
  const [openFaq, setOpenFaq] = useState(null);
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
    <div className="w-full max-w-7xl mx-auto">
      {/* Hero / Website Preview */}
      <div
        className="relative mb-14"
        style={{
          animation: "fadein 0.5s ease-out",
        }}
      >
        {/* พื้นที่สำหรับรูปภาพเว็บไซต์ */}
        <div className="relative w-full h-84 md:h-80 overflow-hidden rounded-[28px]">
          <img
            src="/images/TU.jpg"
            alt="ภาพเว็บไซต์ระบบเบิกค่าตอบแทนการสอน"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = "flex";
              }
            }}
          />

          {/* Placeholder ก่อนนำรูปจริงมาใส่ */}
          <div
            className="absolute inset-0 hidden items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #69C4CE, #3FA7B3)",
            }}
          >
            <div className="text-center text-white">
              <div
                className="mx-auto mb-3 w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.35)",
                }}
              >
                <FileText size={30} />
              </div>
              <p className="text-sm font-semibold">ใส่รูปภาพเว็บไซต์ตรงนี้</p>
              <p className="text-xs mt-1 opacity-80">public/images/hero.jpg</p>
            </div>
          </div>



        </div>



        {/* Quick navigation — วางทับบริเวณด้านล่างของรูป TU */}
          <nav
        className="absolute z-20 left-1/2 -translate-x-1/2 bottom-[130px] w-[92%] md:w-[88%] rounded-2xl border bg-white p-2.5 md:p-3"
        style={{
          borderColor: "#D7E8EB",
          boxShadow: "0 12px 30px rgba(40,100,110,0.16)",
        }}
        aria-label="เมนูภายในหน้า"
      >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                ["documents", "ประกาศและเอกสาร"],
                ["scope", "ขอบเขตการเบิก"],
                ["users", "ผู้มีสิทธิ์"],
                ["rates", "อัตราค่าตอบแทน"],
                ["process", "วิธียื่นคำขอ"],
                ["faq", "คำถามที่พบบ่อย"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex items-center justify-center min-h-11 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "#F2F9FA",
                    color: "#2E8291",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

        {/* ข้อมูลเว็บไซต์ใต้รูป */}
        <div className="px-6 md:px-8 pt-16 md:pt-20 pb-4">
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
            </div>

            
          </div>
        </div>
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
      {visible.scope && (

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

      {/* ผู้มีสิทธิ์ / ผู้ใช้งานหลัก */}
      {visible.users && (
        <SectionCard id="users" className="scroll-mt-6 p-6 mb-8" hoverable={false}>
          <SectionTitle
            icon={Users}
            title="ผู้มีสิทธิ์ยื่นคำขอเบิก"
            sub="ผู้ใช้งานที่สามารถยื่นคำขอในระบบ"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl mx-auto">
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

                    {/* gradient เพื่อให้ข้อความอ่านง่าย */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(10,38,45,0.78) 0%, rgba(10,38,45,0.12) 65%, rgba(10,38,45,0.02) 100%)",
                      }}
                    />

                    {/* ลำดับแบบ minimal */}
                    <span
                      className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        color: "#FFFFFF",
                        border: "1px solid rgba(255,255,255,0.28)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      0{index + 1}
                    </span>

                    {/* ชื่อบทบาทวางบนภาพ */}
                    <div className="absolute left-5 right-5 bottom-4">
                      <p className="font-bold text-base text-white leading-6">
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

      {/* อัตราค่าตอบแทน */}
      {visible.rates && (
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
                  <div key={v} className="px-4 py-2.5 text-center">
                    <p className="text-xs mb-1.5" style={{ color: C.sub }}>
                      อัตราค่าตอบแทน
                    </p>
                    <p className="text-xl font-extrabold" style={{ color: C.tealDark }}>
                      {v.toLocaleString()}
                      <span className="text-xs font-semibold ml-1">บาท/ชม.</span>
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
                  background: "#F3F0FF",
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

                  <p className="text-lg font-extrabold text-right shrink-0" style={{ color: C.tealDark }}>
                    {r.rate}
                    <span className="text-xs font-semibold ml-1">บาท/ชม.</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* เงื่อนไข/หลักเกณฑ์ */}
      {visible.conditions && (
        <section className="mb-8 px-1">
          <SectionTitle icon={Info} title="เงื่อนไขและหลักเกณฑ์" />
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
      {visible.documents && (
        <SectionCard
          id="documents"
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

      {/* ขั้นตอน */}
      {visible.process && (
        <SectionCard id="process" className="scroll-mt-6 p-6 mb-8">
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
                    borderColor: isOpen ? "#9DD2D9" : "#DCEBED",
                    background: isOpen ? "#F5FBFC" : "#FFFFFF",
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
                      style={{ color: "#58727A" }}
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


      {/* ฟังก์ชันที่จะมีในระบบ */}
      {visible.features && (
        <div
          className="grid sm:grid-cols-2 gap-8 mb-8 px-1"
        >
          <div className="sm:pr-6 sm:border-r" style={{ borderColor: C.border }}>
            <p className="font-bold text-sm mb-3" style={{ color: C.ink }}>สำหรับอาจารย์</p>
            <ul className="space-y-1">
              {TEACHER_FEATURES.map((f) => (
                <HoverListItem key={f} className="flex items-start gap-2 text-xs px-2 py-1.5 -mx-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                  <span style={{ color: C.sub }}>{f}</span>
                </HoverListItem>
              ))}
            </ul>
          </div>

          <div className="sm:pl-2">
            <p className="font-bold text-sm mb-3" style={{ color: C.ink }}>สำหรับเจ้าหน้าที่</p>
            <ul className="space-y-1">
              {STAFF_FEATURES.map((f) => (
                <HoverListItem key={f} className="flex items-start gap-2 text-xs px-2 py-1.5 -mx-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.teal }} />
                  <span style={{ color: C.sub }}>{f}</span>
                </HoverListItem>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}