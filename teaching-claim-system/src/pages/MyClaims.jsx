import React, { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";

export default function MyClaims({ claims, goDetail, goCreate }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const counts = useMemo(() => {
    const c = { Draft: 0, Pending: 0, Approved: 0, Rejected: 0 };
    claims.forEach((cl) => (c[cl.status] = (c[cl.status] || 0) + 1));
    return c;
  }, [claims]);

  const filtered = claims.filter((cl) => {
    const matchesQuery =
      query.trim() === "" ||
      cl.id.toLowerCase().includes(query.toLowerCase()) ||
      cl.courseCode.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || cl.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1 max-w-md" style={{ borderColor: C.border }}>
          <Search size={16} style={{ color: C.sub }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา รหัสคำขอ / รายวิชา"
            className="outline-none text-sm w-full bg-transparent"
            style={{ color: C.ink }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border px-4 py-2.5 text-sm font-medium bg-white"
          style={{ borderColor: C.border, color: C.ink }}
        >
          <option value="All">ทุกสถานะ</option>
          <option value="Draft">แบบร่าง</option>
          <option value="Pending">รอตรวจสอบ</option>
          <option value="Approved">อนุมัติแล้ว</option>
          <option value="Rejected">ไม่อนุมัติ</option>
        </select>
        <button
          onClick={goCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm md:ml-auto"
          style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
        >
          สร้างคำขอ <Plus size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          ["Draft", "แบบร่าง", "#EDF0F2", "#5B6672"],
          ["Pending", "รอตรวจสอบ", "#FEF6D8", "#9A7B06"],
          ["Approved", "อนุมัติแล้ว", "#DFF5E6", "#1E8E4F"],
          ["Rejected", "ไม่อนุมัติ", "#FBE2E2", "#C23B3B"],
        ].map(([key, label, bg, fg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "All" : key)}
            className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
            style={{ background: bg, outline: statusFilter === key ? `2px solid ${fg}` : "none" }}
          >
            <p className="font-bold" style={{ color: fg }}>{label}</p>
            <p className="text-3xl font-extrabold mt-1" style={{ color: fg }}>{counts[key] || 0}</p>
          </button>
        ))}
      </div>

      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: C.sub }}>
                {["รหัสคำขอ", "รายวิชา", "เดือน", "จำนวนเงิน", "สถานะ"].map((h) => (
                  <th key={h} className="px-6 py-4 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cl) => (
                <tr key={cl.id} onClick={() => goDetail(cl.id)} className="border-t cursor-pointer hover:bg-[#F8FBFC]" style={{ borderColor: C.border }}>
                  <td className="px-6 py-4 font-semibold whitespace-nowrap" style={{ color: C.ink }}>{cl.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: C.ink }}>{cl.courseCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: C.sub }}>{cl.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: C.ink }}>฿{cl.amount.toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusPill status={cl.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: C.sub }}>ไม่พบคำขอที่ตรงกับเงื่อนไข</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
