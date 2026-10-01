import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Menu,
  Search,
  X,
  Bell,
  LogIn,
  LogOut,
  UserRound,
  ChevronRight,
  SearchX,
  CornerDownLeft,
} from "lucide-react";
import { C } from "../theme";
import { getInitial } from "../data/users";
import { searchInfo } from "../data/searchIndex";

// ไฮไลต์คำที่ค้นหาในข้อความผลลัพธ์
function Highlight({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded px-0.5" style={{ background: "#FFE9A8", color: "inherit" }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

// ตัดข้อความยาวให้พอดีบรรทัด โดยเลื่อนให้เห็นคำที่ค้นเจอ
function snippet(text, query, max = 90) {
  if (!text) return "";
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (text.length <= max || i < 0 || i < max - 20) return text.length > max ? text.slice(0, max) + "…" : text;
  return "…" + text.slice(Math.max(0, i - 25), Math.max(0, i - 25) + max) + "…";
}

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
  onOpenProfile,
  onSearchSelect,
}) {
  // ชื่อที่แสดงมาจากผู้ใช้ที่ล็อกอินจริง (ไม่ fix ชื่อไว้แล้ว)
  const userName = user?.name || "";

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = getInitial(user);

  const closeSearch = () => {
    setSearchOpen(false);
    setActiveIndex(0);
    onSearchChange && onSearchChange("");
  };

  const [activeIndex, setActiveIndex] = useState(0);
  const searchWrapRef = useRef(null);
  const results = useMemo(() => searchInfo(searchQuery), [searchQuery]);
  const hasQuery = searchQuery.trim() !== "";

  // กดนอกกล่องค้นหาแล้วปิดผลลัพธ์
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  const chooseResult = (r) => {
    if (!r) return;
    setSearchOpen(false);
    setActiveIndex(0);
    onSearchChange && onSearchChange("");
    onSearchSelect && onSearchSelect(r.sectionId);
  };

  const handleSearchKey = (e) => {
    if (e.key === "Escape") return closeSearch();
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseResult(results[activeIndex]);
    }
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
          /* Search Box + ผลลัพธ์ที่ลอยอยู่ใต้ช่องค้นหา */
          <div ref={searchWrapRef} className="relative w-full max-w-xl">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 w-full transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${C.border}`,
                boxShadow: hasQuery ? "0 0 0 3px rgba(255,255,255,0.25)" : "none",
              }}
            >
              <Search size={17} style={{ color: C.sub }} className="shrink-0" />

              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setActiveIndex(0);
                  onSearchChange && onSearchChange(e.target.value);
                }}
                onKeyDown={handleSearchKey}
                placeholder="ค้นหาข้อมูล เช่น อัตราค่าสอน, เอกสาร, ขั้นตอน..."
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: C.ink }}
              />

              <button
                onClick={closeSearch}
                aria-label="ปิดการค้นหา"
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5"
              >
                <X size={14} style={{ color: C.sub }} />
              </button>
            </div>

            {hasQuery && (
              <div
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white overflow-hidden z-50"
                style={{
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 24px 50px -12px rgba(15,40,70,0.38)",
                  animation: "fadein .15s ease-out",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
                  style={{ background: C.tealSoft, color: C.tealDark }}
                >
                  <span>
                    ผลการค้นหาสำหรับ “{searchQuery.trim()}”
                  </span>
                  {results.length > 0 && <span>{results.length} รายการ</span>}
                </div>

                {results.length === 0 ? (
                  <div className="flex flex-col items-center text-center px-6 py-8">
                    <SearchX size={28} style={{ color: C.sub }} className="mb-2" />
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>
                      ไม่พบข้อมูลที่ตรงกับคำค้นหา
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.sub }}>
                      ลองค้นหาด้วยคำอื่น เช่น "อัตรา" "เอกสาร" หรือ "ขั้นตอน"
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-[60vh] overflow-y-auto py-1.5">
                    {results.map((r, i) => {
                      const active = i === activeIndex;
                      return (
                        <li key={`${r.sectionId}-${i}`}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => chooseResult(r)}
                            className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
                            style={{ background: active ? C.tealSoft : "transparent" }}
                          >
                            <span
                              className="mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                              style={{ background: "#FFFFFF", color: C.tealDark, border: `1px solid ${C.border}` }}
                            >
                              {r.section}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold leading-5 truncate" style={{ color: C.ink }}>
                                <Highlight text={r.title} query={searchQuery} />
                              </span>
                              {r.text && (
                                <span className="block text-xs leading-5 mt-0.5 truncate" style={{ color: C.sub }}>
                                  <Highlight text={snippet(r.text, searchQuery)} query={searchQuery} />
                                </span>
                              )}
                            </span>
                            {active && (
                              <CornerDownLeft size={14} className="mt-1 shrink-0" style={{ color: C.tealDark }} />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
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
                        onOpenProfile && onOpenProfile();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#E8F0FA] transition-colors"
                      style={{ color: C.ink }}
                    >
                      <UserRound size={17} style={{ color: C.tealDark }} />
                      ดูข้อมูลส่วนตัว
                      <ChevronRight size={16} className="ml-auto" style={{ color: C.sub }} />
                    </button>

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