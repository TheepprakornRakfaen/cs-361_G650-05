import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Sparkles,
  History,
  ClipboardCheck,
  XCircle,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import RoleBadge from "../components/RoleBadge";
import { STATUS, getAuditMeta, isPending, isApprovedOrBeyond } from "../data/workflow";
import { PERMISSION as P, ROLE_META, can } from "../data/roles";
import { getAuditLogs } from "../services/api";
import {
  SLA_BUSINESS_DAYS,
  SLA_STYLE,
  businessDaysSince,
  slaLevel,
} from "../utils/sla";

const baht = (n) => `฿${Number(n || 0).toLocaleString()}`;

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
};

const shortDateTime = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/*
 * ภาพรวมระบบสำหรับเจ้าหน้าที่ / ผู้อนุมัติ / ผู้ดูแลระบบ
 * - ตัวเลขทั้งหมดคำนวณจากคิวคำขอ (GET /api/claims?scope=review)
 * - กิจกรรมล่าสุดดึงจาก audit log (เฉพาะผู้มีสิทธิ์ audit.view_all)
 */
export default function AdminOverview({
  user,
  claims = [],
  termLabel = "",
  loading = false,
  goReview,
  goDetail,
  goAuditLog,
  goSettings,
}) {
  const canSeeFinance = can(user, P.FINANCE_VIEW);
  const canSeeAudit = can(user, P.AUDIT_VIEW_ALL);
  const canManageSettings = can(user, P.SETTINGS_MANAGE);

  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!canSeeAudit) return undefined;

    let active = true;

    getAuditLogs({ limit: 6 })
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
        setActivity(list.slice(0, 6));
      })
      .catch(() => active && setActivity([]));

    return () => {
      active = false;
    };
  }, [canSeeAudit, claims.length]);

  const stats = useMemo(() => {
    // ยังพิจารณาไม่เสร็จ = รอตรวจ + ตรวจแล้วรออนุมัติ
    const pending = claims.filter((c) => isPending(c.status));

    const withWait = pending.map((c) => ({
      claim: c,
      days: businessDaysSince(c.submittedAt || c.createdAt),
    }));

    const sum = (list) => list.reduce((s, c) => s + Number(c.amount || 0), 0);

    return {
      pending: pending.length,
      submitted: claims.filter((c) => c.status === STATUS.SUBMITTED).length,
      reviewed: claims.filter((c) => c.status === STATUS.REVIEWED).length,
      returned: claims.filter((c) => c.status === STATUS.RETURNED).length,
      approved: claims.filter((c) => c.status === STATUS.APPROVED).length,
      paid: claims.filter((c) => c.status === STATUS.PAID).length,
      rejected: claims.filter((c) => c.status === STATUS.REJECTED).length,
      overdue: withWait.filter((w) => slaLevel(w.days) === "overdue").length,
      pendingAmount: sum(pending),
      // ยอดอนุมัติ = อนุมัติแล้วทั้งที่รอการเงิน / รอจ่าย / จ่ายแล้ว
      approvedAmount: sum(claims.filter((c) => isApprovedOrBeyond(c.status))),
      paidAmount: sum(claims.filter((c) => c.status === STATUS.PAID)),
      // รอนานสุดก่อน
      urgent: withWait
        .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
        .slice(0, 5),
    };
  }, [claims]);

  // สรุปตามรายวิชา
  const byCourse = useMemo(() => {
    const map = new Map();

    claims.forEach((c) => {
      const key = c.courseCode || "-";
      const row = map.get(key) || {
        code: key,
        name: c.courseName || "",
        total: 0,
        pending: 0,
        approved: 0,
        hours: 0,
        amount: 0,
      };

      row.total += 1;
      row.hours += Number(c.hours || 0);
      if (isPending(c.status)) row.pending += 1;
      if (isApprovedOrBeyond(c.status)) {
        row.approved += 1;
        row.amount += Number(c.amount || 0);
      }

      map.set(key, row);
    });

    return [...map.values()].sort((a, b) => b.pending - a.pending || b.total - a.total);
  }, [claims]);

  const cards = [
    { key: STATUS.SUBMITTED, label: "รอตรวจสอบ", value: stats.submitted, icon: Clock3, style: STATUS_STYLE.Submitted, hint: "รอผู้ตรวจสอบ" },
    { key: STATUS.REVIEWED, label: "รออนุมัติ", value: stats.reviewed, icon: ClipboardCheck, style: STATUS_STYLE.Reviewed, hint: "ตรวจแล้ว รอผู้อนุมัติ" },
    { key: "overdue", label: "เกินกำหนด", value: stats.overdue, icon: AlertTriangle, style: SLA_STYLE.overdue, hint: `รอเกิน ${SLA_BUSINESS_DAYS} วันทำการ` },
    { key: STATUS.RETURNED, label: "ส่งคืนแก้ไข", value: stats.returned, icon: RotateCcw, style: STATUS_STYLE.Returned, hint: "รอผู้ยื่นแก้ไข" },
    { key: STATUS.APPROVED, label: "อนุมัติแล้ว รอจ่าย", value: stats.approved, icon: CheckCircle2, style: STATUS_STYLE.Approved, hint: "รอระบบจ่ายเงิน" },
    { key: STATUS.PAID, label: "จ่ายเงินแล้ว", value: stats.paid, icon: CheckCircle2, style: STATUS_STYLE.Paid, hint: "สิ้นสุดกระบวนการ" },
    { key: STATUS.REJECTED, label: "ไม่อนุมัติ", value: stats.rejected, icon: XCircle, style: STATUS_STYLE.Rejected, hint: "สิ้นสุดการพิจารณา" },
  ];

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

        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:items-end">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm opacity-85">
              <Sparkles size={14} />
              {greeting()}
            </p>
            <p className="text-2xl md:text-3xl font-extrabold mt-1 truncate">
              {user?.name || "ภาพรวมระบบ"}
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

          {canSeeFinance && (
            <div
              className="rounded-2xl px-5 py-4 md:min-w-[17rem]"
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <p className="flex items-center gap-1.5 text-xs opacity-85">
                <Wallet size={14} />
                ยอดรอพิจารณา
              </p>
              <p className="text-3xl font-extrabold figure mt-1 leading-none">
                {baht(stats.pendingAmount)}
              </p>
              <p className="text-xs opacity-75 mt-2">
                อนุมัติแล้วรวม{" "}
                <span className="font-bold figure">{baht(stats.approvedAmount)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* [V4] ทางลัดศูนย์จัดการระบบสำหรับผู้ดูแลระบบ (Admin Management Quick Link) */}
      {canManageSettings && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 mb-8 rounded-3xl border bg-white shadow-sm"
          style={{ borderColor: C.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: C.tealSoft, color: C.tealDark }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                ศูนย์จัดการระบบสำหรับผู้ดูแลระบบ (Admin Portal - V4)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดการประเภทค่าตอบแทน (FR2), ข้อมูลรายวิชา (FR3), กฎและเงื่อนไข (FR4), ผู้ใช้งานและสิทธิ์ (FR5), งบประมาณ (FR9), นำเข้าข้อมูล (FR10)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => goSettings?.()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-sm shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
          >
            <span>เปิดหน้าจัดการระบบ</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ===== การ์ดสถานะ ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {cards.map(({ key, label, value, icon: Icon, style, hint }) => {
          const highlight = key === "overdue" && value > 0;

          return (
            <button
              type="button"
              key={key}
              onClick={() => goReview?.(key === "overdue" ? STATUS.SUBMITTED : key)}
              className="group bg-white rounded-2xl p-4 md:p-5 text-left border transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: highlight ? style.fg : C.border,
                boxShadow: highlight ? `0 0 0 1px ${style.fg}` : undefined,
              }}
              title={`ดูคำขอ${label}`}
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
                {loading ? "–" : value}
              </span>
              <span className="block text-sm font-semibold mt-1.5" style={{ color: style.fg }}>
                {label}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: C.sub }}>
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`grid grid-cols-1 gap-6 mb-8 ${
          canSeeAudit ? "xl:grid-cols-[3fr_2fr]" : ""
        }`}
      >
        {/* ===== รอนานที่สุด ===== */}
        <div className="min-w-0">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h3 className="font-bold" style={{ color: C.ink }}>
                คำขอที่รอนานที่สุด
              </h3>
              <p className="text-xs mt-0.5" style={{ color: C.sub }}>
                นับเฉพาะวันทำการ · กำหนดพิจารณาภายใน {SLA_BUSINESS_DAYS} วันทำการ
              </p>
            </div>
            <button
              type="button"
              onClick={() => goReview?.(STATUS.SUBMITTED)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors hover:bg-[#E8F0FA]"
              style={{ color: C.tealDark }}
            >
              ไปที่คิว
              <ArrowRight size={15} />
            </button>
          </div>

          <SectionCard hoverable={false} className="overflow-hidden">
            {stats.urgent.length > 0 ? (
              <ul>
                {stats.urgent.map(({ claim, days }, i) => {
                  const sla = SLA_STYLE[slaLevel(days)];

                  return (
                    <li key={claim.id} className={i ? "border-t" : ""} style={{ borderColor: C.border }}>
                      <button
                        type="button"
                        onClick={() => goDetail?.(claim.id)}
                        className="group w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#F8FBFC] transition-colors"
                      >
                        <span
                          className="w-14 shrink-0 text-center rounded-xl py-1.5"
                          style={{ background: sla.bg, color: sla.fg }}
                        >
                          <span className="block text-lg font-extrabold leading-none figure">{days ?? "-"}</span>
                          <span className="block text-[10px] font-semibold mt-0.5">วันทำการ</span>
                        </span>

                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-sm truncate" style={{ color: C.ink }}>
                            #{claim.code || claim.id}
                          </span>
                          <span className="block text-xs truncate" style={{ color: C.sub }}>
                            {claim.claimantName || "-"} · {claim.courseCode || "-"}
                            {canSeeFinance && ` · ${baht(claim.amount)}`}
                          </span>
                        </span>

                        <ChevronRight
                          size={16}
                          className="shrink-0 transition-transform group-hover:translate-x-0.5"
                          style={{ color: C.sub }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: "#1E8E4F" }} />
                <p className="text-sm font-semibold" style={{ color: C.ink }}>
                  {loading ? "กำลังโหลด..." : "ไม่มีคำขอที่รอตรวจสอบ"}
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ===== กิจกรรมล่าสุด ===== */}
        {canSeeAudit && (
          <div className="min-w-0">
            <div className="flex items-end justify-between mb-3">
              <h3 className="font-bold" style={{ color: C.ink }}>
                กิจกรรมล่าสุด
              </h3>
              <button
                type="button"
                onClick={goAuditLog}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors hover:bg-[#E8F0FA]"
                style={{ color: C.tealDark }}
              >
                ดูทั้งหมด
                <ArrowRight size={15} />
              </button>
            </div>

            <SectionCard hoverable={false} className="p-5">
              {activity.length > 0 ? (
                <ol className="relative">
                  {activity.map((log, i) => {
                    const meta = getAuditMeta(log.action);
                    const to = STATUS_STYLE[log.to_status || log.toStatus];

                    return (
                      <li key={log.id || i} className="flex gap-3 pb-4 last:pb-0">
                        <span className="flex flex-col items-center">
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ background: to?.fg || C.teal }}
                          />
                          {i < activity.length - 1 && (
                            <span className="w-px flex-1 mt-1" style={{ background: C.border }} />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm" style={{ color: C.ink }}>
                            <b>{log.actor_name || log.actorName || "ระบบ"}</b> {meta.label}
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 text-xs mt-0.5" style={{ color: C.sub }}>
                            {ROLE_META[log.actor_role || log.actorRole] && (
                              <RoleBadge roleKey={log.actor_role || log.actorRole} />
                            )}
                            {shortDateTime(log.created_at || log.createdAt)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-sm text-center py-6" style={{ color: C.sub }}>
                  <History size={22} className="mx-auto mb-2 opacity-60" />
                  ยังไม่มีกิจกรรม
                </p>
              )}
            </SectionCard>
          </div>
        )}
      </div>

      {/* ===== สรุปตามรายวิชา ===== */}
      <h3 className="font-bold mb-3" style={{ color: C.ink }}>
        สรุปตามรายวิชา
      </h3>

      <SectionCard hoverable={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: C.sub, background: "#F7FAFC" }}>
                {[
                  ["รายวิชา", ""],
                  ["คำขอทั้งหมด", "text-right"],
                  ["รอตรวจสอบ", "text-right"],
                  ["อนุมัติแล้ว", "text-right"],
                  ["ชั่วโมงรวม", "text-right"],
                  ...(canSeeFinance ? [["ยอดอนุมัติ", "text-right"]] : []),
                ].map(([h, align]) => (
                  <th key={h} className={`px-5 py-3 font-semibold whitespace-nowrap text-xs ${align}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {byCourse.map((row) => (
                <tr key={row.code} className="border-t" style={{ borderColor: C.border }}>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: C.tealSoft, color: C.tealDark }}
                      >
                        <ClipboardCheck size={15} />
                      </span>
                      <span>
                        <span className="block font-semibold" style={{ color: C.ink }}>{row.code}</span>
                        {row.name && (
                          <span className="block text-xs max-w-[14rem] truncate" style={{ color: C.sub }}>
                            {row.name}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right figure" style={{ color: C.ink }}>{row.total}</td>
                  <td className="px-5 py-3.5 text-right figure">
                    {row.pending > 0 ? (
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: STATUS_STYLE.Submitted.bg, color: STATUS_STYLE.Submitted.fg }}
                      >
                        {row.pending}
                      </span>
                    ) : (
                      <span style={{ color: C.sub }}>0</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right figure" style={{ color: C.ink }}>{row.approved}</td>
                  <td className="px-5 py-3.5 text-right figure" style={{ color: C.ink }}>{row.hours.toLocaleString()} ชม.</td>
                  {canSeeFinance && (
                    <td className="px-5 py-3.5 text-right figure font-bold" style={{ color: C.ink }}>
                      {baht(row.amount)}
                    </td>
                  )}
                </tr>
              ))}

              {byCourse.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: C.sub }}>
                    {loading ? "กำลังโหลด..." : "ยังไม่มีคำขอในระบบ"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
