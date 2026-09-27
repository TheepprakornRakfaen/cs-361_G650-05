import React, { useState } from "react";
import { Menu, Search, X, Bell, LogIn, LogOut } from "lucide-react";
import { C, USER_NAME } from "../theme";

export default function Topbar({
  onMenuClick,
  subtitle,
  searchQuery = "",
  onSearchChange,
  onProfileClick,
  isLoggedIn = false,
  userName = USER_NAME,
  onLogout,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = userName?.trim()?.charAt(0) || "U";

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
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 h-11 pl-1.5 pr-1.5 sm:pr-4 rounded-full font-bold text-sm text-white transition-all active:scale-[0.98] hover:bg-white/10"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  background: C.rose,
                  color: "#FFFFFF",
                }}
              >
                {initial}
              </span>
              <span className="hidden sm:inline max-w-[10rem] truncate">
                {userName}
              </span>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg z-50 overflow-hidden"
                  style={{ borderColor: C.border }}
                >
                  <div
                    className="px-4 py-3 text-xs font-semibold truncate border-b"
                    style={{ color: C.ink, borderColor: C.border }}
                  >
                    {userName}
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout && onLogout();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold hover:bg-[#FCE9EA] transition-colors"
                    style={{ color: C.rose }}
                  >
                    <LogOut size={15} />
                    ออกจากระบบ
                  </button>
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