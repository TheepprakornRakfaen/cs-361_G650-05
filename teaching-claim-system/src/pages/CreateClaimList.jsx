import React, { useMemo, useState } from "react";
import { Search, ChevronDown, Plus, Clock } from "lucide-react";
import { C } from "../theme";
import { ROUNDS, courseByCode } from "../data/mockData";
import SectionCard from "../components/SectionCard";

export default function CreateClaimList({ goCreateForRound }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    return ROUNDS.filter((r) => {
      const course = courseByCode(r.courseCode);
      const haystack = `${r.id} ${r.label} ${course.code} ${course.name}`.toLowerCase();
      const matchesQuery = query.trim() === "" || haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1" style={{ borderColor: C.border }}>
          <Search size={16} style={{ color: C.sub }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา รหัสคำขอ / รายวิชา"
            className="outline-none text-sm w-full bg-transparent"
            style={{ color: C.ink }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-full border pl-4 pr-9 py-2.5 text-sm font-medium bg-white"
            style={{ borderColor: C.border, color: C.ink }}
          >
            <option value="All">สถานะ</option>
            <option value="Open">เปิดรับ</option>
            <option value="Closed">ปิดรับ</option>
          </select>
          <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.sub }} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((r) => {
          const course = courseByCode(r.courseCode);
          const open = r.status === "Open";
          return (
            <SectionCard key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-extrabold text-[15px]" style={{ color: C.ink }}>{r.label}</p>
                  <p className="text-xs mt-1" style={{ color: C.sub }}>{r.period}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: C.sub }}>
                    ส่งหลักฐานภายใน {r.deadline}
                  </p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: C.tealDark }}>
                    {course.code} — {course.name}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                  style={open ? { background: "#DFF5E6", color: "#1E8E4F" } : { background: "#EDF0F2", color: "#5B6672" }}
                >
                  {open ? "เปิดรับ" : "ปิดรับ"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: C.sub }}>
                  <Clock size={13} /> เหลือ {course.quota - course.used} จาก {course.quota} ชม.
                </span>
                <button
                  disabled={!open}
                  onClick={() => open && goCreateForRound(r)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: open ? `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` : C.sub }}
                >
                  สร้างคำขอ <Plus size={14} />
                </button>
              </div>
            </SectionCard>
          );
        })}

        {filtered.length === 0 && (
          <SectionCard className="p-10 text-center text-sm" >
            <span style={{ color: C.sub }}>ไม่พบรอบที่ตรงกับเงื่อนไข</span>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
