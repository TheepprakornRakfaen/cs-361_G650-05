import React, { useMemo } from "react";
import {
  Plus,
  ArrowRight,
  CalendarDays,
  Wallet,
  FileText,
  ChevronRight,
  PencilLine,
  Clock3,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  CalendarClock,
  Sparkles,
  XCircle,
  ClipboardCheck,
} from "lucide-react";
import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";
import { formatDuration } from "../utils/time";

// การ์ดสรุปสถานะ — กดแล้วไปหน้าคำขอของฉันที่กรองสถานะนั้นไว้
// bar = สีในแถบสัดส่วนบนพื้นน้ำเงิน (สีพาสเทลของ STATUS_STYLE จางเกินไปบนพื้นเข้ม)
const STAT_CARDS = [
  { key: "Draft", icon: PencilLine, hint: "ยังไม่ได้ยื่นคำขอ", bar: "#CBD5E1" },
  { key: "Submitted", icon: Clock3, hint: "อยู่ระหว่างการตรวจสอบโดยเจ้าหน้าที่", bar: "#FCD34D" },
  { key: "Reviewed", icon: ClipboardCheck, hint: "ตรวจสอบแล้ว รอผู้อนุมัติพิจารณา", bar: "#A5B4FC" },
  { key: "Returned", icon: RotateCcw, hint: "กรุณาแก้ไขและยื่นคำขออีกครั้ง", bar: "#FB923C" },
  { key: "Approved", icon: CheckCircle2, hint: "อนุมัติแล้ว รอจ่ายเงิน", bar: "#4ADE80" },
  { key: "Paid", icon: CheckCircle2, hint: "จ่ายเงินเรียบร้อยแล้ว", bar: "#22C55E" },
  { key: "Rejected", icon: XCircle, hint: "สิ้นสุดการพิจารณา ดูเหตุผลในรายละเอียด", bar: "#F87171" },
];

const DAY = 86400000;

const thaiShortDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ความคืบหน้าของรอบ (0–100) + ข้อความเหลือกี่วัน
const roundProgress = (openAt, closeAt) => {
  const open = new Date(openAt).getTime();
  const close = new Date(closeAt).getTime();

  if (Number.isNaN(open) || Number.isNaN(close) || close <= open) {
    return { percent: 0, daysLeft: null };
  }

  const now = Date.now();
  const percent = Math.min(100, Math.max(0, ((now - open) / (close - open)) * 100));
  const daysLeft = Math.max(0, Math.ceil((close - now) / DAY));

  return { percent, daysLeft };
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
};

export default function Dashboard({
  user,
  claims = [],
  rounds = [],
  termLabel = "",
  goCreate,
  goCreateForRound,
  findRoundClaims,
  goDetail,
  goMyClaims,
}) {
  const counts = useMemo(() => {
    const c = {
      Draft: 0,
      Submitted: 0,
      Returned: 0,
      Approved: 0,
      Paid: 0,
      Rejected: 0,
    };

    claims.forEach((cl) => {
      c[cl.status] = (c[cl.status] || 0) + 1;
    });

    return c;
  }, [claims]);

  const approvedAmount = claims
    .filter((cl) => ["Approved", "Paid"].includes(cl.status))
    .reduce((sum, cl) => sum + Number(cl.amount || 0), 0);

  // ยังพิจารณาไม่เสร็จ (รอตรวจ + รออนุมัติ)
  const pendingAmount = claims
    .filter((cl) => cl.status === "Submitted" || cl.status === "Reviewed")
    .reduce((sum, cl) => sum + Number(cl.amount || 0), 0);

  // นับเฉพาะสถานะหลักใน STAT_CARDS ใช้ทำแถบสัดส่วน
  const trackedTotal = STAT_CARDS.reduce(
    (sum, { key }) => sum + (counts[key] || 0),
    0
  );

  // claims เรียงใหม่สุดก่อนมาจาก App แล้ว
  const recent = claims.slice(0, 5);

  /*
   * รอบการยื่นจริงจาก API
   * มีรอบเปิดอยู่ → แสดงรอบนั้น / ไม่มี → แสดงรอบถัดไปที่จะเปิด
   */
  const openRound = rounds.find((r) => r.status === "Open");
  // 1 รอบยื่นได้หลายคำขอ จนกว่าชั่วโมงจะครบ → แสดงจำนวนที่ยื่นแล้วควบคู่กับปุ่มสร้าง
  const roundClaims = findRoundClaims?.(openRound) || [];
  const submittedClaim = roundClaims[0] || null;

  const nextRound = openRound
    ? null
    : [...rounds]
        .filter((r) => r.openAt && new Date(r.openAt) > new Date())
        .sort((a, b) => new Date(a.openAt) - new Date(b.openAt))[0];

  const progress = openRound
    ? roundProgress(openRound.openAt, openRound.closeAt)
    : null;

  const gradient = `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`;

  return (
    <div className="w-full">
      {/* ===== Hero ===== */}
      <div
        className="rounded-3xl p-6 md:p-8 text-white mb-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(125deg, #4A8BCB 0%, ${C.teal} 35%, ${C.tealDark} 100%)`,
        }}
      >
        <div
          className="absolute -right-16 -top-24 w-80 h-80 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="absolute right-40 -bottom-24 w-56 h-56 rounded-full"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />

        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:items-end">
          {/* ซ้าย: ทักทาย */}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm opacity-85">
              <Sparkles size={14} />
              {greeting()}
            </p>
            <p className="text-2xl md:text-3xl font-extrabold mt-1 truncate">
              {user ? user.name : "ภาพรวมคำขอเบิกค่าสอน"}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {user?.role && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  {user.role}
                </span>
              )}
              {termLabel && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <CalendarDays size={13} />
                  ภาคการศึกษา {termLabel}
                </span>
              )}
            </div>
          </div>

          {/* ขวา: ยอดเงิน */}
          <div
            className="rounded-2xl px-5 py-4 md:min-w-[17rem]"
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <p className="flex items-center gap-1.5 text-xs opacity-85">
              <Wallet size={14} />
              ยอดที่อนุมัติแล้ว
            </p>
            <p className="text-3xl font-extrabold figure mt-1 leading-none">
              ฿{approvedAmount.toLocaleString()}
            </p>
            <p className="text-xs opacity-75 mt-2">
              รอตรวจสอบอีก{" "}
              <span className="font-bold figure">
                ฿{pendingAmount.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* แถบสัดส่วนสถานะ */}
        {trackedTotal > 0 && (
          <div className="relative mt-6">
            <div
              className="flex h-2.5 rounded-full overflow-hidden gap-0.5"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              {STAT_CARDS.map(({ key, bar }) =>
                counts[key] > 0 ? (
                  <div
                    key={key}
                    style={{
                      width: `${(counts[key] / trackedTotal) * 100}%`,
                      background: bar,
                    }}
                    title={`${STATUS_STYLE[key].label} ${counts[key]}`}
                  />
                ) : null
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] opacity-85">
              {STAT_CARDS.map(({ key, bar }) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: bar }}
                  />
                  {STATUS_STYLE[key].label} {counts[key] || 0}
                </span>
              ))}
              <span className="opacity-80">· ทั้งหมด {claims.length} คำขอ</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== การ์ดสถานะ ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        {STAT_CARDS.map(({ key, icon: Icon, hint }) => {
          const style = STATUS_STYLE[key];
          const highlight = key === "Returned" && counts.Returned > 0;

          return (
            <button
              type="button"
              key={key}
              onClick={() => goMyClaims && goMyClaims(key)}
              className="group bg-white rounded-2xl p-4 md:p-5 text-left border transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: highlight ? style.fg : C.border,
                boxShadow: highlight ? `0 0 0 1px ${style.fg}` : undefined,
              }}
              title={`ดูคำขอที่${style.label}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: style.bg, color: style.fg }}
                >
                  <Icon size={18} />
                </span>
                <ArrowRight
                  size={16}
                  className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                  style={{ color: style.fg }}
                />
              </span>

              <span
                className="block text-3xl font-extrabold figure mt-3 leading-none"
                style={{ color: C.ink }}
              >
                {counts[key] || 0}
              </span>
              <span
                className="block text-sm font-semibold mt-1.5"
                style={{ color: style.fg }}
              >
                {style.label}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: C.sub }}>
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== ต้องทำต่อ ===== */}
      {(counts.Returned > 0 || counts.Draft > 0) && (
        <div
          className="rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center justify-between gap-3 border"
          style={{
            background: counts.Returned > 0 ? STATUS_STYLE.Returned.bg : "#F6F8FA",
            borderColor: counts.Returned > 0 ? "#F6D9BC" : C.border,
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white"
              style={{
                color: counts.Returned > 0 ? STATUS_STYLE.Returned.fg : C.sub,
              }}
            >
              <AlertTriangle size={17} />
            </span>
            <div>
              <p className="font-bold text-sm" style={{ color: C.ink }}>
                {counts.Returned > 0
                  ? `มีคำขอที่ถูกส่งกลับให้แก้ไข ${counts.Returned} รายการ`
                  : `มีแบบร่างที่ยังไม่ได้ยื่น ${counts.Draft} รายการ`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.sub }}>
                {counts.Returned > 0
                  ? "กรุณาตรวจสอบรายการที่ต้องแก้ไขในรายละเอียดคำขอ และยื่นคำขออีกครั้ง"
                  : "กรุณายื่นคำขอภายในกำหนดของรอบการยื่น"}
                {counts.Returned > 0 &&
                  counts.Draft > 0 &&
                  ` · มีแบบร่างที่ยังไม่ได้ยื่นอีก ${counts.Draft} รายการ`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              goMyClaims && goMyClaims(counts.Returned > 0 ? "Returned" : "Draft")
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: counts.Returned > 0 ? STATUS_STYLE.Returned.fg : C.tealDark,
            }}
          >
            {counts.Returned > 0 ? "แก้ไขคำขอ" : "ดูแบบร่าง"}
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ===== รอบการยื่น ===== */}
      <h3 className="font-bold mb-3" style={{ color: C.ink }}>
        รอบการยื่นปัจจุบัน
      </h3>

      <SectionCard className="p-5 md:p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: openRound ? "#DFF5E6" : "#EEF2F5",
                color: openRound ? "#1E8E4F" : C.sub,
              }}
            >
              <CalendarClock size={22} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-lg" style={{ color: C.ink }}>
                  {openRound ? openRound.label : "ยังไม่มีรอบที่เปิดรับ"}
                </p>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={
                    openRound
                      ? { background: "#DFF5E6", color: "#1E8E4F" }
                      : { background: "#EDF0F2", color: "#5B6672" }
                  }
                >
                  {openRound ? "เปิดรับ" : "ปิดรับ"}
                </span>
              </div>

              <p className="text-sm mt-0.5" style={{ color: C.sub }}>
                {openRound
                  ? `${openRound.termLabel ? `ภาค ${openRound.termLabel} · ` : ""}${openRound.period}`
                  : nextRound
                    ? `รอบถัดไป: ${nextRound.label} เปิด ${thaiShortDate(nextRound.openAt)}`
                    : "รอเจ้าหน้าที่ประกาศรอบการยื่นถัดไป"}
              </p>
            </div>
          </div>

          {openRound && submittedClaim && (
            <button
              onClick={() => goDetail?.(submittedClaim.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: "#DFF5E6", color: "#1E8E4F" }}
              title="ดูรายละเอียดคำขอล่าสุดที่ยื่นในรอบนี้"
            >
              <CheckCircle2 size={16} />
              ยื่นแล้ว {roundClaims.length} คำขอ
            </button>
          )}

          {openRound && (
            <button
              onClick={() =>
                goCreateForRound ? goCreateForRound(openRound) : goCreate?.()
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 shadow-sm"
              style={{ background: gradient }}
            >
              <Plus size={16} />
              {submittedClaim ? "สร้างคำขอเพิ่มในรอบนี้" : "สร้างคำขอในรอบนี้"}
            </button>
          )}
        </div>

        {/* แถบเวลาของรอบ: ผ่านไปแล้วกี่ % / เหลือกี่วัน */}
        {progress && progress.daysLeft !== null && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span style={{ color: C.sub }}>
                เปิด {thaiShortDate(openRound.openAt)}
              </span>
              <span
                className="font-semibold"
                style={{ color: progress.daysLeft <= 3 ? "#B4531A" : C.tealDark }}
              >
                {progress.daysLeft === 0
                  ? "ปิดรับวันนี้"
                  : `เหลืออีก ${progress.daysLeft} วัน`}
              </span>
              <span style={{ color: C.sub }}>
                ปิด {thaiShortDate(openRound.closeAt)}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "#EEF2F5" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(progress.percent, 3)}%`,
                  background:
                    progress.daysLeft <= 3
                      ? "linear-gradient(90deg, #F0A060, #B4531A)"
                      : gradient,
                }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ===== คำขอล่าสุด ===== */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="font-bold" style={{ color: C.ink }}>
            คำขอล่าสุด
          </h3>
          {claims.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: C.sub }}>
              {recent.length} รายการล่าสุดจากทั้งหมด {claims.length} รายการ · กดที่แถวเพื่อดูรายละเอียด
            </p>
          )}
        </div>

        {claims.length > 0 && (
          <button
            onClick={() => goMyClaims && goMyClaims("All")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:bg-[#E8F0FA]"
            style={{ color: C.tealDark }}
          >
            ดูทั้งหมด
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      <SectionCard className="overflow-hidden" hoverable={false}>
        {recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: C.sub, background: "#F7FAFC" }}>
                  {[
                    ["รหัสคำขอ", ""],
                    ["รายวิชา", ""],
                    ["ภาค", ""],
                    ["เดือนที่สอน", ""],
                    ["ชั่วโมง", "text-right"],
                    ["จำนวนเงิน", "text-right"],
                    ["สถานะ", ""],
                    ["", ""],
                  ].map(([heading, align], i) => (
                    <th
                      key={heading || `col-${i}`}
                      className={`px-5 py-3 font-semibold whitespace-nowrap text-xs ${align}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {recent.map((cl) => (
                  <tr
                    key={cl.id}
                    onClick={() => goDetail && goDetail(cl.id)}
                    className="group border-t cursor-pointer hover:bg-[#F8FBFC] transition-colors"
                    style={{ borderColor: C.border }}
                  >
                    <td
                      className="px-5 py-3.5 font-semibold whitespace-nowrap"
                      style={{ color: C.ink }}
                    >
                      #{cl.code || cl.id}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: C.tealSoft, color: C.tealDark }}
                        >
                          <FileText size={15} />
                        </span>
                        <span>
                          <span className="block font-semibold" style={{ color: C.ink }}>
                            {cl.courseCode || "-"}
                          </span>
                          {cl.courseName && (
                            <span
                              className="block text-xs max-w-[12rem] truncate"
                              style={{ color: C.sub }}
                            >
                              {cl.courseName}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: C.sub }}>
                      {cl.termLabel || "-"}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: C.sub }}>
                      {cl.month || "-"}
                    </td>

                    <td
                      className="px-5 py-3.5 whitespace-nowrap text-right"
                      style={{ color: C.ink }}
                    >
                      {formatDuration(Number(cl.hours || 0) * 60)}
                    </td>

                    <td
                      className="px-5 py-3.5 whitespace-nowrap text-right figure font-bold"
                      style={{ color: C.ink }}
                    >
                      ฿{Number(cl.amount || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusPill status={cl.status} />
                    </td>

                    <td className="pr-4 py-3.5">
                      <ChevronRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                        style={{ color: C.sub }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ยังไม่มีคำขอ — มีไอคอนและปุ่มให้เริ่มได้เลย */
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
