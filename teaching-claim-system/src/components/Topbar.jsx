import React, { useState } from "react";
import {
  Menu,
  Search,
  X,
  Bell,
  LogIn,
  LogOut,
} from "lucide-react";
import { C } from "../theme";
import { getInitial } from "../data/users";

const AVATAR_BG = `linear-gradient(135deg, #F07A7E, ${C.rose})`;

export default function Topbar({
  onMenuClick,
  subtitle,
  searchQuery = "",
  onSearchChange,
  onProfileClick,
  isLoggedIn = false,
  user = null,
  onLogout,
}) {
  // ชื่อที่แสดงมาจากผู้ใช้ที่ล็อกอินจริง (ไม่ fix ชื่อไว้แล้ว)
  const userName = user?.name || "";

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = getInitial(user);

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange && onSearchChange("");
  };

  return (
    <header
      className="flex items-center justify-between px-6 md:px-9 h-20 shrink-0 sticky top-0 z-40"
      style={{
        background: C.tealDark,
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-5 min-w-0 flex-1">
        {/* Menu */}
        <button
          onClick={onMenuClick}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 shrink-0 transition-all"
          style={{ color: "#FFFFFF" }}
        >
          <Menu size={20} />
        </button>

        {searchOpen ? (
          /* Search Box */
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 w-full max-w-sm transition-all duration-200"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${C.border}`,
            }}
          >
            <Search
              size={17}
              style={{ color: C.sub }}
              className="shrink-0"
            />

            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) =>
                onSearchChange && onSearchChange(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Escape" && closeSearch()
              }
              placeholder="ค้นหาข้อมูล เช่น อัตราค่าสอน, เอกสาร, ขั้นตอน..."
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: C.ink }}
            />

            <button
              onClick={closeSearch}
              className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5"
            >
              <X size={14} style={{ color: C.sub }} />
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 shrink-0 transition-all"
              style={{ color: "#FFFFFF" }}
            >
              <Search size={19} />
            </button>

            {/* Page title */}
            {subtitle && (
              <span
                className="hidden sm:inline text-sm font-medium truncate"
                style={{ color: "#FFFFFF" }}
              >
                {subtitle}
              </span>
            )}
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Notification */}
        <button
          className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
          style={{ color: "#FFFFFF" }}
        >
          <Bell
            size={19}
            fill="#FFFFFF"
            strokeWidth={2}
          />
        </button>

        {/* เข้าสู่ระบบ / โปรไฟล์ */}
        {isLoggedIn ? (
          <div className="relative shrink-0">
            {/* แสดงแค่รูปโปรไฟล์ ชื่อเต็มดูได้ตอนกดเปิดเมนู */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={userName}
              aria-label={`บัญชีผู้ใช้: ${userName}`}
              aria-expanded={menuOpen}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0 ring-2 transition-all active:scale-[0.96] ${
                menuOpen ? "ring-white" : "ring-white/40 hover:ring-white"
              }`}
              style={{
                background: AVATAR_BG,
                boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
              }}
            >
              {initial}
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-3 w-72 rounded-2xl border bg-white z-50 overflow-hidden"
                  style={{
                    borderColor: C.border,
                    boxShadow: "0 20px 45px -12px rgba(15,40,70,0.35)",
                    animation: "fadein .18s ease-out",
                  }}
                >
                  {/* ส่วนหัว: รูปโปรไฟล์ + ชื่อ + ตำแหน่ง */}
                  <div
                    className="relative px-5 py-4 flex items-center gap-3 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${C.tealDark}, ${C.teal})`,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute -right-8 -top-10 w-28 h-28 rounded-full"
                      style={{ background: "rgba(255,255,255,0.10)" }}
                    />

                    <span
                      className="relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 ring-2 ring-white/70"
                      style={{ background: AVATAR_BG }}
                    >
                      {initial}
                    </span>

                    <div className="relative min-w-0 text-white">
                      <p className="text-sm font-bold truncate">
                        {userName}
                      </p>
                      {user?.email && (
                        <p className="text-xs truncate opacity-80 mt-0.5">
                          {user.email}
                        </p>
                      )}
                      {user?.role && (
                        <span
                          className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: "rgba(255,255,255,0.20)" }}
                        >
                          {user.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout && onLogout();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#FCE9EA] transition-colors"
                      style={{ color: C.rose }}
                    >
                      <LogOut size={17} />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 h-11 pl-4 pr-5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] shrink-0"
            style={{ background: C.rose }}
          >
            <LogIn size={17} />
            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
          </button>
        )}
      </div>
    </header>
  );
}