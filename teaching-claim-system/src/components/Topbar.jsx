import React, { useState } from "react";
import { Menu, Search, X, Bell, User } from "lucide-react";
import { C, USER_NAME } from "../theme";

export default function Topbar({
  onMenuClick,
  subtitle,
  searchQuery = "",
  onSearchChange,
  onProfileClick,
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange && onSearchChange("");
  };

  return (
    <header
      className="flex items-center justify-between px-6 md:px-9 h-20 shrink-0"
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

        {/* Profile */}
        <button
          onClick={onProfileClick}
          className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-all"
        >
          <User
            size={18}
            style={{ color: "#FFFFFF" }}
          />
        </button>
      </div>
    </header>
  );
}