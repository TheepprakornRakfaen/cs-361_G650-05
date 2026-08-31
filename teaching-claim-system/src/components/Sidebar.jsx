import React from "react";
import { Home, LogOut, GraduationCap, X } from "lucide-react";
import { C } from "../theme";

export const NAV_ITEMS = [
  { id: "home", label: "หน้าแรก", icon: Home },
];

// mobileOpen: ควบคุมการเปิด/ปิดแบบ drawer บนจอเล็ก (< md)
// collapsed: ควบคุมการย่อ/ขยายความกว้างบนจอ desktop (>= md) เหมือนเดิม
export default function Sidebar({ view, setView, collapsed, mobileOpen, onCloseMobile }) {
  const handleNavClick = (id) => {
    setView(id);
    onCloseMobile && onCloseMobile(); // ปิด drawer อัตโนมัติเมื่อเลือกเมนูบนมือถือ
  };

  return (
    <>
      {/* Overlay ทึบด้านหลัง แสดงเฉพาะบนมือถือตอน drawer เปิด */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-0 flex flex-col justify-between shrink-0 bg-white border-r transition-transform md:transition-all duration-200 w-[260px] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${collapsed ? "md:w-[84px]" : "md:w-[280px]"}`}
        style={{ borderColor: C.border }}
      >
        <div>
          <div className={`flex items-center gap-3 py-8 px-7 ${collapsed ? "md:px-3 md:justify-center" : ""}`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: C.roseSoft }}>
              <GraduationCap size={22} style={{ color: C.rose }} />
            </div>
            <div className={`leading-tight ${collapsed ? "md:hidden" : ""}`}>
              <p className="font-extrabold text-[15px]" style={{ color: C.ink }}>ระบบเบิกค่าสอน</p>
              <p className="text-xs" style={{ color: C.sub }}>Teaching Claim System</p>
            </div>
            {/* ปุ่มปิด แสดงเฉพาะมือถือ */}
            <button
              onClick={onCloseMobile}
              className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8] md:hidden shrink-0"
              aria-label="ปิดเมนู"
            >
              <X size={18} style={{ color: C.ink }} />
            </button>
          </div>

          <nav className="px-4 mt-2 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold transition-colors"
                  style={
                    active
                      ? { background: `linear-gradient(90deg, ${C.teal}, #7FD3E1)`, color: "#fff" }
                      : { color: C.ink }
                  }
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.tealSoft; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-4 pb-8">
          <button className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold w-full" style={{ color: C.rose }}>
            <LogOut size={19} />
            <span className={collapsed ? "md:hidden" : ""}>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
}