import React from "react";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
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
      <p className="font-bold text-sm mb-4 text-white">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-sm opacity-70 hover:opacity-100 transition-opacity duration-150"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear() + 543;

  return (
    <footer className="relative w-full mt-10 text-white overflow-hidden">
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
        <div className="relative w-full px-6 md:px-9 pt-12 pb-8">
          <div className="w-full grid sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* แบรนด์ */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
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

              <p className="text-sm opacity-70 leading-relaxed mb-5">
                ศูนย์รวมข้อมูลและขั้นตอนการเบิกค่าตอบแทนการสอนและค่าตอบแทนที่เกี่ยวข้อง
                สำหรับอาจารย์และผู้ช่วยสอนอย่างครบถ้วน สะดวก รวดเร็ว
              </p>

              <div className="flex items-center gap-2.5">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-150"
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
              <p className="font-bold text-sm mb-4">
                ติดต่อเรา
              </p>

              <ul className="space-y-3 text-sm opacity-75">
                <li className="flex items-start gap-2.5">
                  <MapPin size={16} className="shrink-0 mt-0.5" />
                  <span>
                    ฝ่ายการเจ้าหน้าที่ ชั้น 2 อาคารสำนักงาน มหาวิทยาลัย
                  </span>
                </li>

                <li className="flex items-center gap-2.5">
                  <Phone size={16} className="shrink-0" />
                  <span>02-xxx-xxxx ต่อ xxx</span>
                </li>

                <li className="flex items-center gap-2.5">
                  <Mail size={16} className="shrink-0" />
                  <span>hr-claim@university.ac.th</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div
            className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t"
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
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full transition-transform duration-150 hover:-translate-y-0.5"
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