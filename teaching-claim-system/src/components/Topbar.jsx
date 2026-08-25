import React from "react";
import { Menu, Search, Bell, User } from "lucide-react";
import { C, USER_NAME } from "../theme";

export default function Topbar({ onMenuClick, subtitle }) {
  return (
    <header className="flex items-center justify-between px-6 md:px-9 h-20 bg-white border-b shrink-0" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-5">
        <button onClick={onMenuClick} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8]" style={{ color: C.ink }}>
          <Menu size={20} />
        </button>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8]" style={{ color: C.ink }}>
          <Search size={19} />
        </button>
        {subtitle && <span className="hidden sm:inline text-sm font-medium" style={{ color: C.sub }}>{subtitle}</span>}
      </div>
      <div className="flex items-center gap-4">
        <button className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F2F6F8]" style={{ color: C.tealDark }}>
          <Bell size={19} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: "#4F6BE0" }} />
        </button>
        <span className="hidden sm:inline text-sm font-semibold" style={{ color: C.tealDark }}>{USER_NAME}</span>
        <div className="w-10 h-10 rounded-full bg-[#EEF2F5] flex items-center justify-center">
          <User size={18} style={{ color: C.sub }} />
        </div>
      </div>
    </header>
  );
}
