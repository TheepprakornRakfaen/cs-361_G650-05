import React from "react";
import { LayoutDashboard, BookOpen, ClipboardList, FilePlus2, LogOut, GraduationCap } from "lucide-react";
import { C } from "../theme";

export const NAV_ITEMS = [
  { id: "dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { id: "assignments", label: "งานสอน", icon: BookOpen },
  { id: "myclaims", label: "คำขอของฉัน", icon: ClipboardList },
  { id: "create", label: "สร้างคำขอ", icon: FilePlus2 },
];

export default function Sidebar({ view, setView, collapsed }) {
  return (
    <aside
      className={`flex flex-col justify-between shrink-0 bg-white border-r transition-all duration-200 ${
        collapsed ? "w-[84px]" : "w-[240px] sm:w-[280px]"
      }`}
      style={{ borderColor: C.border }}
    >
      <div>
        <div className="flex items-center gap-3 px-7 py-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: C.roseSoft }}>
            <GraduationCap size={22} style={{ color: C.rose }} />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-extrabold text-[15px]" style={{ color: C.ink }}>ระบบเบิกค่าสอน</p>
              <p className="text-xs" style={{ color: C.sub }}>Teaching Claim System</p>
            </div>
          )}
        </div>

        <nav className="px-4 mt-2 flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id || (view === "detail" && item.id === "myclaims");
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
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
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 pb-8">
        <button className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold w-full" style={{ color: C.rose }}>
          <LogOut size={19} />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>
    </aside>
  );
}
