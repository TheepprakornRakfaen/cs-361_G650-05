import React, { useState } from "react";
import { Menu, Search, X, Bell, User } from "lucide-react";
import { C, USER_NAME } from "../theme";

export default function Topbar({ onMenuClick, subtitle, searchQuery = "", onSearchChange, onProfileClick }) {
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange && onSearchChange("");
  };

  return (
    <header className="flex items-center justify-between px-6 md:px-9 h-20 bg-white border-b shrink-0" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-5 min-w-0 flex-1">
        <button onClick={onMenuClick} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8] shrink-0" style={{ color: C.ink }}>
          <Menu size={20} />
        </button>

        {searchOpen ? (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 w-full max-w-sm transition-all duration-200"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}
          >
            <Search size={17} style={{ color: C.sub }} className="shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              placeholder="ค้นหาข้อมูล เช่น อัตราค่าสอน, เอกสาร, ขั้นตอน..."
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: C.ink }}
            />
            <button onClick={closeSearch} className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5">
              <X size={14} style={{ color: C.sub }} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8] shrink-0"
              style={{ color: C.ink }}
            >
              <Search size={19} />
            </button>
            {subtitle && <span className="hidden sm:inline text-sm font-medium truncate" style={{ color: C.sub }}>{subtitle}</span>}
          </>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <button className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8]" style={{ color: C.tealDark }}>
          <Bell size={19} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: "#4F6BE0" }} />
        </button>
        <span className="hidden sm:inline text-sm font-semibold" style={{ color: C.tealDark }}>{USER_NAME}</span>
        <button
          onClick={onProfileClick}
          className="w-10 h-10 rounded-full bg-[#EEF2F5] flex items-center justify-center hover:ring-2 transition-all"
          style={{ "--tw-ring-color": C.teal }}
        >
          <User size={18} style={{ color: C.sub }} />
        </button>
      </div>
    </header>
  );
}