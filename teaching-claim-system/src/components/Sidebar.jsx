import React from "react";
import {
  Home,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FilePlus2,
  LogOut,
  LogIn,
  Lock,
  GraduationCap,
  X,
} from "lucide-react";
import { C } from "../theme";

export const NAV_ITEMS = [
  { id: "home", label: "หน้าแรก", icon: Home },
  // requiresLogin: ต้องเข้าสู่ระบบก่อน (ให้ตรงกับ PROTECTED_VIEWS ใน App.jsx)
  { id: "dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, requiresLogin: true },
  { id: "assignments", label: "งานสอน", icon: BookOpen, requiresLogin: true },
  { id: "myclaims", label: "คำขอของฉัน", icon: ClipboardList, requiresLogin: true },
  { id: "create", label: "สร้างคำขอ", icon: FilePlus2, requiresLogin: true },
];

export default function Sidebar({
  view,
  setView,
  collapsed,
  mobileOpen,
  onCloseMobile,
  isLoggedIn = false,
  onLogout,
  onLogin,
}) {
  const handleNavClick = (id) => {
    setView(id);
    onCloseMobile && onCloseMobile();
  };

  return (
    <>
      {/* Overlay สำหรับมือถือ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
  className={`
    fixed
    top-[80px]
    bottom-0
    left-0
    z-40
    flex flex-col justify-between shrink-0
    bg-white border-r
    transition-transform md:transition-all duration-200
    w-[260px]
    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
    ${collapsed ? "md:w-[84px]" : "md:w-[280px]"}
  `}
  style={{ borderColor: C.border }}
>
        {/* ส่วนบน */}
        <div>
          {/* Logo / ชื่อระบบ */}
          <div
            className={`
              flex items-center gap-3 py-8 px-7
              ${collapsed ? "md:px-3 md:justify-center" : ""}
            `}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: C.roseSoft }}
            >
              <GraduationCap
                size={22}
                style={{ color: C.rose }}
              />
            </div>

            <div
              className={`leading-tight ${
                collapsed ? "md:hidden" : ""
              }`}
            >
              <p
                className="font-extrabold text-[15px]"
                style={{ color: C.ink }}
              >
                ระบบเบิกค่าสอน
              </p>

              <p
                className="text-xs"
                style={{ color: C.sub }}
              >
                Teaching Claim System
              </p>
            </div>

            {/* ปุ่มปิดบนมือถือ */}
            <button
              onClick={onCloseMobile}
              className="
                ml-auto
                w-9 h-9
                rounded-xl
                flex items-center justify-center
                hover:bg-[#F2F6F8]
                md:hidden
                shrink-0
              "
              aria-label="ปิดเมนู"
            >
              <X
                size={18}
                style={{ color: C.ink }}
              />
            </button>
          </div>

          {/* เมนูหลัก */}
          <nav className="px-4 mt-2 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              const active =
                view === item.id ||
                (
                  view === "detail" &&
                  item.id === "myclaims"
                );

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    handleNavClick(item.id)
                  }
                  className={`
                    flex items-center gap-3
                    px-4 py-3
                    rounded-2xl
                    text-[15px]
                    font-semibold
                    transition-colors duration-200
                    w-full
                    ${active ? "" : "hover:bg-[#E8F0FA]"}
                  `}
                  /*
                   * ใช้ hover ของ Tailwind แทนการแก้ style ผ่าน onMouseEnter/Leave
                   * เพราะแบบเดิมทำให้เมนูที่เพิ่งออกมาค้างเป็นตัวหนังสือสีขาว
                   */
                  style={
                    active
                      ? {
                          background: `linear-gradient(90deg, ${C.teal}, #6FA8D9)`,
                          color: "#fff",
                          boxShadow:
                            "0 4px 12px rgba(30,86,135,0.20)",
                        }
                      : {
                          color: C.ink,
                        }
                  }
                >
                  <Icon
                    size={19}
                    className="shrink-0"
                  />

                  <span
                    className={
                      collapsed
                        ? "md:hidden"
                        : ""
                    }
                  >
                    {item.label}
                  </span>

                  {/* แม่กุญแจ = ต้องเข้าสู่ระบบก่อน */}
                  {item.requiresLogin && !isLoggedIn && (
                    <Lock
                      size={14}
                      aria-label="ต้องเข้าสู่ระบบ"
                      className={`ml-auto shrink-0 ${collapsed ? "md:hidden" : ""}`}
                      style={{ color: C.sub }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ออกจากระบบ / เข้าสู่ระบบ — เปลี่ยนตามสถานะการล็อกอิน */}
        <div className="px-4 pb-8">
          <button
            className={`
              flex items-center gap-3
              px-4 py-3
              rounded-2xl
              text-[15px]
              font-semibold
              w-full
              transition-colors
              ${isLoggedIn ? "hover:bg-[#FCE9EA]" : "hover:bg-[#E8F0FA]"}
            `}
            style={{ color: isLoggedIn ? C.rose : C.tealDark }}
            onClick={() => {
              if (isLoggedIn) {
                onLogout && onLogout();
              } else {
                onLogin && onLogin();
              }
              onCloseMobile && onCloseMobile();
            }}
          >
            {isLoggedIn ? (
              <LogOut size={19} className="shrink-0" />
            ) : (
              <LogIn size={19} className="shrink-0" />
            )}

            <span
              className={
                collapsed
                  ? "md:hidden"
                  : ""
              }
            >
              {isLoggedIn ? "ออกจากระบบ" : "เข้าสู่ระบบ"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}