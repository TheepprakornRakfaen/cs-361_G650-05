import React, { useMemo } from "react";
import {
  Plus,
  ArrowRight,
  CalendarDays,
  Wallet,
  FileText,
  ChevronRight,
} from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";
import { formatDuration } from "../utils/time";

export default function Dashboard({
  user,
  claims = [],
  goCreate,
  goDetail,
  goMyClaims,
}) {
  const counts = useMemo(() => {
    const c = {
      Draft: 0,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
    };

    claims.forEach((cl) => {
      c[cl.status] = (c[cl.status] || 0) + 1;
    });

    return c;
  }, [claims]);

  const approvedAmount = claims
    .filter((cl) => cl.status === "Approved")
    .reduce((sum, cl) => sum + Number(cl.amount || 0), 0);

  const recent = claims.slice(0, 4);

  // ข้อมูลรอบการยื่น ใช้ตรงนี้แทน mockData.js
  const openRound = {
    label: "รอบการยื่นภาคการศึกษา 1/2569",
    period: "เปิดรับคำขอ 1 มิถุนายน - 31 กรกฎาคม 2569",
    deadline: "31 กรกฎาคม 2569",
  };

  const gradient = `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`;

  return (
    <div className="w-full">
      {/* Summary */}
      <div
        className="rounded-3xl p-6 md:p-8 text-white mb-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})`,
        }}
      >
        <div
          className="absolute -right-10 -top-16 w-64 h-64 rounded-full"
          style={{
            background: "rgba(255,255,255,0.10)",
          }}
        />

        {/* หัวข้อ + ชื่อเต็มของคนที่ล็อกอิน + ภาคการศึกษา */}
        <div className="mb-6 relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-extrabold">
              ภาพรวมคำขอเบิกค่าสอน
            </p>
            <p className="text-sm opacity-85 mt-1">
              {user
                ? `${user.name} · ${user.role || "ผู้ใช้งานระบบ"}`
                : "เข้าสู่ระบบเพื่อดูคำขอเบิกค่าสอนของคุณ"}
            </p>
          </div>

          {/* เดิมเป็นลูกศรเหมือน dropdown แต่กดไม่ได้ — เปลี่ยนเป็นป้ายบอกภาคเฉยๆ */}
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <CalendarDays size={14} />
            ภาคการศึกษา 1/2569
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
          {[
            ["ทั้งหมด", claims.length],
            ["แบบร่าง", counts.Draft],
            ["รอตรวจสอบ", counts.Pending],
            ["อนุมัติแล้ว", counts.Approved],
          ].map(([label, val]) => (
            <div
              key={label}
              className="rounded-2xl px-5 py-4"
              style={{
                background: "rgba(255,255,255,0.16)",
              }}
            >
              <p className="text-sm opacity-90">
                {label}
              </p>

              <p className="text-3xl font-extrabold mt-1 figure">
                {val}
              </p>
            </div>
          ))}
        </div>

        <p className="relative flex items-center gap-2 text-sm mt-5 opacity-95">
          <Wallet size={16} />
          ยอดที่อนุมัติแล้ว
          <span className="text-lg font-extrabold figure">
            ฿{approvedAmount.toLocaleString()}
          </span>
        </p>
      </div>

      {/* รอบการยื่น */}
      <h3
        className="font-bold mb-3"
        style={{ color: C.ink }}
      >
        รอบการยื่นปัจจุบัน
      </h3>

      <SectionCard className="p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p
            className="font-bold text-lg"
            style={{ color: C.ink }}
          >
            {openRound.label}
          </p>

          <p
            className="text-sm mt-1"
            style={{ color: C.sub }}
          >
            {openRound.period}
          </p>

          <p
            className="text-sm"
            style={{ color: C.sub }}
          >
            ส่งหลักฐานภายใน {openRound.deadline}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span
            className="px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{
              background: "#DFF5E6",
              color: "#1E8E4F",
            }}
          >
            เปิดรับ
          </span>

          <button
            onClick={goCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: gradient }}
          >
            สร้างคำขอ
            <Plus size={16} />
          </button>
        </div>
      </SectionCard>

      {/* คำขอล่าสุด */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-bold"
          style={{ color: C.ink }}
        >
          คำขอล่าสุด
        </h3>

        {claims.length > 0 && (
          <button
            onClick={goMyClaims}
            className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: C.tealDark }}
          >
            ดูทั้งหมด
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      <SectionCard className="overflow-hidden" hoverable={false}>
        {recent.length > 0 ? (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {recent.map((cl) => (
              <button
                key={cl.id}
                onClick={() => goDetail && goDetail(cl.id)}
                className="w-full flex items-center gap-4 px-5 md:px-6 py-4 text-left hover:bg-[#F8FBFC] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: C.tealSoft }}
                >
                  <FileText size={18} style={{ color: C.tealDark }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-sm truncate"
                    style={{ color: C.ink }}
                  >
                    {cl.courseCode}
                    <span className="font-medium" style={{ color: C.sub }}>
                      {" "}· {cl.month || "-"}
                    </span>
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: C.sub }}
                  >
                    {formatDuration(Number(cl.hours || 0) * 60)} ·{" "}
                    <span className="figure font-semibold" style={{ color: C.ink }}>
                      ฿{Number(cl.amount || 0).toLocaleString()}
                    </span>
                  </p>
                </div>

                <StatusPill status={cl.status} />

                <ChevronRight
                  size={16}
                  className="shrink-0 hidden sm:block"
                  style={{ color: C.sub }}
                />
              </button>
            ))}
          </div>
        ) : (
          /* ยังไม่มีคำขอ — มีไอคอนและปุ่มให้เริ่มได้เลย แทนข้อความเล็กๆ กลางกล่อง */
          <div className="px-6 py-12 text-center">
            <div
              className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: C.tealSoft }}
            >
              <FileText size={24} style={{ color: C.tealDark }} />
            </div>

            <p className="font-bold" style={{ color: C.ink }}>
              ยังไม่มีคำขอ
            </p>
            <p className="text-sm mt-1 mb-5" style={{ color: C.sub }}>
              เริ่มยื่นคำขอเบิกค่าสอนครั้งแรกได้เลย
            </p>

            <button
              onClick={goCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: gradient }}
            >
              <Plus size={16} />
              สร้างคำขอแรก
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
