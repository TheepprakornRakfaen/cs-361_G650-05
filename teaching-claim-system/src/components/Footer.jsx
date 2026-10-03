import React from "react";
import {
  GraduationCap,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  ArrowUp,
} from "lucide-react";
import { C } from "../theme";

const LINK_GROUPS = [
  {
    title: "เมนูลัด",
    links: [
      { label: "หน้าแรก", href: "#" },
      { label: "อัตราค่าตอบแทน", href: "#rates" },
      { label: "เอกสารประกอบการเบิก", href: "#documents" },
      { label: "ขั้นตอนการยื่นคำขอ", href: "#process" },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { label: "คำถามที่พบบ่อย", href: "#faq" },
      { label: "คู่มือการใช้งานระบบ", href: "#" },
      { label: "ติดต่อเจ้าหน้าที่", href: "#" },
      { label: "แจ้งปัญหาการใช้งาน", href: "#" },
    ],
  },
];

function FooterLinkList({ title, links }) {
  return (
    <div>
      <p className="font-bold text-sm mb-2.5 text-white">{title}</p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-[13px] opacity-70 hover:opacity-100 transition-opacity duration-150"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer({ onContactClick }) {
  const year = new Date().getFullYear() + 543;

  return (
    <footer className="relative w-full mt-0 text-white overflow-hidden">
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
      />

      <div
        className="relative w-full"
        style={{
          background: `linear-gradient(180deg, #10233B 0%, #0A1B2E 100%)`,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        {/* วงกลมตกแต่ง */}
        <div
          className="absolute -left-20 -top-20 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(62,127,193,0.20), transparent 70%)`,
          }}
        />

        <div
          className="absolute -right-16 bottom-0 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(30,86,135,0.18), transparent 70%)`,
          }}
        />

        {/* ไม่ใช้ max-w / mx-auto เพื่อให้ Footer กว้างเท่ากับ Main และ Header */}
        <div className="relative w-full px-6 md:px-9 pt-7 pb-4">
          <div className="w-full grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">

            {/* แบรนด์ */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` }}
                >
                  <GraduationCap size={20} className="text-white" />
                </div>

                <div className="leading-tight">
                  <p className="font-extrabold text-sm">
                    ระบบเบิกค่าสอน
                  </p>
                  <p className="text-xs opacity-60">
                    Teaching Claim System
                  </p>
                </div>
              </div>

              <p className="text-xs opacity-70 leading-relaxed mb-3">
                ศูนย์รวมข้อมูลและขั้นตอนการเบิกค่าตอบแทนการสอนและค่าตอบแทนที่เกี่ยวข้อง
                สำหรับอาจารย์และผู้ช่วยสอนอย่างครบถ้วน สะดวก รวดเร็ว
              </p>

              <div className="flex items-center gap-2.5">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.tealDark)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)")
                    }
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* เมนู */}
            {LINK_GROUPS.map((g) => (
              <FooterLinkList
                key={g.title}
                title={g.title}
                links={g.links}
              />
            ))}

            {/* ติดต่อเรา */}
            <div>
              <p className="font-bold text-sm mb-2.5">
                ติดต่อเรา
              </p>

              <p className="text-[13px] opacity-70 leading-relaxed mb-3">
                มีข้อสงสัยหรือพบปัญหาการใช้งาน
                ส่งเรื่องถึงเจ้าหน้าที่ผ่านแบบฟอร์มได้เลย
              </p>

              <button
                type="button"
                onClick={() => onContactClick?.()}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-bold text-white transition-transform duration-150 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
                }}
              >
                <Mail size={16} />
                ไปที่แบบฟอร์มติดต่อ
              </button>
            </div>
          </div>

          {/* Copyright */}
          <div
            className="mt-5 pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-xs opacity-55 text-center sm:text-left">
              © {year} ระบบเบิกค่าตอบแทนการสอน สงวนลิขสิทธิ์ ·
              พัฒนาโดยฝ่ายเทคโนโลยีสารสนเทศ
            </p>

            <button
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <ArrowUp size={13} />
              กลับขึ้นด้านบน
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}