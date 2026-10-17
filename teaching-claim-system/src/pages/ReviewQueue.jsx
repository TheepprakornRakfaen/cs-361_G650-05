import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Loader2,
  Download,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatusPill from "../components/StatusPill";
import Restricted from "../components/Restricted";
import Pagination from "../components/Pagination";
import { STATUS, QUEUE_STATUSES, isReviewed } from "../data/workflow";
import {
  PERMISSION as P,
  can,
  maskEmail,
} from "../data/roles";
import { downloadCsv } from "../utils/csv";
import {
  SLA_BUSINESS_DAYS,
  SLA_STYLE,
  businessDaysSince,
  slaLevel,
} from "../utils/sla";

const SUMMARY = [
  STATUS.SUBMITTED,
  STATUS.RETURNED,
  STATUS.APPROVED,
  STATUS.REJECTED,
];

const PAGE_SIZE = 10;

function formatDate(value) {
  const date = new Date(value);

  return !value || Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

// "1/2569" → เรียงปีใหม่ก่อน แล้วภาคมากก่อน
const termSortKey = (label) => {
  const [semester, year] = String(label).split("/");
  return Number(year || 0) * 10 + Number(semester || 0);
};

const pillClass =
  "rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none";

/*
 * [V3] คิวตรวจสอบ / อนุมัติ
 *  - เจ้าหน้าที่/ผู้อนุมัติ/ผู้ดูแล: เปิดมาที่ "รอตรวจสอบ" เรียงรอนานสุดก่อน
 *  - คอลัมน์ "รอมาแล้ว" นับวันทำการ เทียบกับกำหนด 10 วันทำการ
 * รายการที่เห็นถูกจำกัดโดย backend ตาม role อยู่แล้ว หน้านี้เป็นเพียงตัวกรองเพื่อการแสดงผล
 */
export default function ReviewQueue({
  user,
  claims = [],
  loading = false,
  error = "",
  onReload,
  goDetail,
  // สถานะที่ให้กรองไว้ตอนเปิดหน้า (มาจากการ์ดในหน้าภาพรวมระบบ)
  initialStatus = null,
}) {
  // ผู้มีสิทธิ์ตรวจสอบ/อนุมัติ เปิดมาที่ "รอตรวจสอบ" เลย
  const defaultStatus =
    can(user, P.CLAIM_REVIEW) || can(user, P.CLAIM_APPROVE)
      ? STATUS.SUBMITTED
      : "All";

  const [statusFilter, setStatusFilter] = useState(initialStatus || defaultStatus);
  const [termFilter, setTermFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const canSeeFinance = can(user, P.FINANCE_VIEW);
  const canSeePii = can(user, P.PII_VIEW);
  const canExport = can(user, P.DATA_EXPORT);

  // แบบร่างของผู้อื่นไม่เกี่ยวกับคิว
  const queue = useMemo(
    () => claims.filter((c) => QUEUE_STATUSES.includes(c.status)),
    [claims]
  );

  const termOptions = useMemo(
    () =>
      [...new Set(queue.map((c) => c.termLabel).filter(Boolean))].sort(
        (a, b) => termSortKey(b) - termSortKey(a)
      ),
    [queue]
  );

  const courseOptions = useMemo(
    () =>
      [
        ...new Set(
          queue
            .filter((c) => termFilter === "All" || c.termLabel === termFilter)
            .map((c) => c.courseCode)
            .filter(Boolean)
        ),
      ].sort(),
    [queue, termFilter]
  );

  // ภาค + รายวิชา (ใช้ทั้งการ์ดนับและตาราง)
  const scoped = useMemo(
    () =>
      queue.filter(
        (c) =>
          (termFilter === "All" || c.termLabel === termFilter) &&
          (courseFilter === "All" || c.courseCode === courseFilter)
      ),
    [queue, termFilter, courseFilter]
  );

  const counts = useMemo(() => {
    const result = {};
    scoped.forEach((c) => {
      result[c.status] = (result[c.status] || 0) + 1;
    });
    return result;
  }, [scoped]);

  // คำขอรอตรวจสอบที่เกินกำหนด 10 วันทำการ
  const overdueCount = useMemo(
    () =>
      scoped.filter(
        (c) =>
          c.status === STATUS.SUBMITTED &&
          slaLevel(businessDaysSince(c.submittedAt || c.createdAt)) === "overdue"
      ).length,
    [scoped]
  );

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return scoped
      .filter((c) => statusFilter === "All" || c.status === statusFilter)
      .filter(
        (c) =>
          !keyword ||
          [c.code, c.id, c.courseCode, c.courseName, c.claimantName, c.claimantEmail]
            .map((v) => String(v || "").toLowerCase())
            .some((v) => v.includes(keyword))
      )
      // เก่าสุดก่อน = งานที่รอนานที่สุดอยู่บน
      .sort(
        (a, b) =>
          new Date(a.submittedAt || a.createdAt || 0).getTime() -
          new Date(b.submittedAt || b.createdAt || 0).getTime()
      );
  }, [scoped, statusFilter, query]);

  // เปลี่ยนตัวกรอง → กลับหน้าแรก
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, termFilter, courseFilter]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const readOnly = !can(user, P.CLAIM_REVIEW) && !can(user, P.CLAIM_APPROVE);

  const filtersActive =
    query || statusFilter !== defaultStatus || termFilter !== "All" || courseFilter !== "All";

  const resetFilters = () => {
    setQuery("");
    setStatusFilter(defaultStatus);
    setTermFilter("All");
    setCourseFilter("All");
  };

  const exportCsv = () => {
    downloadCsv(
      `claims-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "รหัสคำขอ",
        "ผู้ยื่น",
        "อีเมล",
        "รายวิชา",
        "ภาค",
        "เดือนที่สอน",
        "ชั่วโมง",
        ...(canSeeFinance ? ["จำนวนเงิน"] : []),
        "วันที่ยื่น",
        "รอมาแล้ว (วันทำการ)",
        "สถานะ",
      ],
      rows.map((c) => [
        c.code || c.id,
        c.claimantName,
        canSeePii ? c.claimantEmail : maskEmail(c.claimantEmail),
        c.courseCode,
        c.termLabel,
        c.month,
        c.hours,
        ...(canSeeFinance ? [c.amount ?? ""] : []),
        formatDate(c.submittedAt || c.createdAt),
        c.status === STATUS.SUBMITTED
          ? businessDaysSince(c.submittedAt || c.createdAt) ?? ""
          : "",
        STATUS_STYLE[c.status]?.label || c.status,
      ])
    );
  };

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title={readOnly ? "คำขอทั้งหมด" : "คิวตรวจสอบและอนุมัติ"}
        description={
          readOnly
            ? "ดูสถานะและประวัติการดำเนินการของคำขอ (อ่านอย่างเดียว)"
            : `เลือกคำขอเพื่อตรวจสอบเอกสาร · กำหนดพิจารณาภายใน ${SLA_BUSINESS_DAYS} วันทำการ`
        }
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: C.border, color: C.tealDark }}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              รีเฟรช
            </button>

{canExport && (
            <button
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
              title="ส่งออกรายการตามตัวกรองปัจจุบัน"
            >
              <Download size={15} />
              ส่งออก CSV
            </button>
)}
          </div>
        }
      />

      {/* Toolbar — รูปแบบเดียวกับหน้า "คำขอของฉัน" */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 mb-6">
        <div
          className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1 min-w-[14rem] max-w-md"
          style={{ borderColor: C.border }}
        >
          <Search size={16} style={{ color: C.sub }} />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา รหัสคำขอ / รายวิชา / ผู้ยื่น"
            className="outline-none text-sm w-full bg-transparent"
            style={{ color: C.ink }}
            aria-label="ค้นหาคำขอ"
          />
        </div>

        <Select
          value={termFilter}
          onChange={(e) => {
            setTermFilter(e.target.value);
            setCourseFilter("All");
          }}
          className={`${pillClass} min-w-[9rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามภาค"
        >
          <option value="All">ทุกภาค</option>
          {termOptions.map((label) => (
            <option key={label} value={label}>
              ภาค {label}
            </option>
          ))}
        </Select>

        <Select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={`${pillClass} min-w-[9rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามรายวิชา"
        >
          <option value="All">ทุกรายวิชา</option>
          {courseOptions.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${pillClass} min-w-[10rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามสถานะ"
        >
          <option value="All">ทุกสถานะ</option>
          {SUMMARY.map((key) => (
            <option key={key} value={key}>
              {STATUS_STYLE[key].label}
            </option>
          ))}
        </Select>

        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-semibold px-2"
            style={{ color: C.tealDark }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* สรุปตามสถานะ — กดเพื่อกรอง (รูปแบบเดียวกับหน้า "คำขอของฉัน") */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {SUMMARY.map((key) => {
          const style = STATUS_STYLE[key];
          const active = statusFilter === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(active ? "All" : key)}
              aria-pressed={active}
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: style.bg,
                outline: active ? `2px solid ${style.fg}` : "none",
              }}
            >
              <p className="font-bold" style={{ color: style.fg }}>
                {style.label}
              </p>

              <p
                className="text-3xl font-extrabold mt-1 figure"
                style={{ color: style.fg }}
              >
                {counts[key] || 0}
              </p>
            </button>
          );
        })}
      </div>

      {/* เตือนคำขอที่เกินกำหนด */}
      {!readOnly && overdueCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 text-sm border"
          style={{
            background: SLA_STYLE.overdue.bg,
            color: SLA_STYLE.overdue.fg,
            borderColor: "#F3C9C9",
          }}
          role="status"
        >
          <AlertTriangle size={17} className="shrink-0" />
          <span>
            มีคำขอรอตรวจสอบเกินกำหนด {SLA_BUSINESS_DAYS} วันทำการ{" "}
            <b>{overdueCount} รายการ</b> (แสดงอยู่ด้านบนของตาราง)
          </span>
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-2xl mb-4 text-sm"
          style={{ background: C.roseSoft, color: "#C23B3B" }}
          role="alert"
        >
          {error}
        </div>
      )}

      <SectionCard hoverable={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: C.sub }}>
                {[
                  ["รหัสคำขอ", ""],
                  ["ผู้ยื่น", ""],
                  ["รายวิชา", ""],
                  ["ยื่นเมื่อ / รอมาแล้ว", ""],
                  ["จำนวนเงิน", "text-right"],
                  ["สถานะ", ""],
                  ["", ""],
                ].map(([h, align], i) => (
                  <th
                    key={h || `col-${i}`}
                    className={`px-5 py-4 font-semibold whitespace-nowrap ${align}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pageRows.map((claim) => {
                const submitted = claim.submittedAt || claim.createdAt;
                const waiting =
                  claim.status === STATUS.SUBMITTED
                    ? businessDaysSince(submitted)
                    : null;
                const sla = SLA_STYLE[slaLevel(waiting)];

                return (
                  <tr
                    key={claim.id}
                    onClick={() => goDetail?.(claim.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goDetail?.(claim.id);
                    }}
                    tabIndex={0}
                    className="group border-t cursor-pointer hover:bg-[#F8FBFC] focus:bg-[#F8FBFC] outline-none transition-colors"
                    style={{ borderColor: C.border }}
                  >
                    <td
                      className="px-5 py-4 font-semibold whitespace-nowrap"
                      style={{ color: C.ink }}
                    >
                      #{claim.code || claim.id}
                    </td>

                    <td className="px-5 py-4 min-w-[10rem]">
                      <p className="font-medium" style={{ color: C.ink }}>
                        {claim.claimantName || "-"}
                      </p>

                      {claim.claimantEmail && (
                        <p className="text-xs" style={{ color: C.sub }}>
                          {canSeePii
                            ? claim.claimantEmail
                            : maskEmail(claim.claimantEmail)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-semibold" style={{ color: C.ink }}>
                        {claim.courseCode || "-"}
                      </p>
                      {claim.courseName && (
                        <p
                          className="text-xs max-w-[9rem] truncate"
                          style={{ color: C.sub }}
                        >
                          {claim.courseName}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <p style={{ color: C.sub }}>{formatDate(submitted)}</p>
                      {waiting !== null && (
                        <span
                          className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: sla.bg, color: sla.fg }}
                          title={`นับเฉพาะวันทำการ · กำหนด ${SLA_BUSINESS_DAYS} วันทำการ`}
                        >
                          รอ {waiting} วันทำการ
                        </span>
                      )}
                    </td>

                    <td
                      className="px-5 py-4 whitespace-nowrap figure text-right font-semibold"
                      style={{ color: C.ink }}
                    >
                      <Restricted
                        allowed={canSeeFinance}
                        value={claim.amount}
                      >
                        ฿{Number(claim.amount || 0).toLocaleString()}
                      </Restricted>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <StatusPill status={claim.status} />

                        {claim.status === STATUS.SUBMITTED &&
                          isReviewed(claim) && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={{ background: "#DFF5E6", color: "#1E8E4F" }}
                            >
                              ตรวจสอบแล้ว
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="pr-4 py-4">
                      <ChevronRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                        style={{ color: C.sub }}
                      />
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: C.ink }}
                    >
                      {loading ? "กำลังโหลด..." : "ไม่มีคำขอในรายการนี้"}
                    </p>

                    {!loading && (
                      <p className="text-xs mt-1" style={{ color: C.sub }}>
                        ลองเปลี่ยนคำค้นหาหรือตัวกรอง
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={rows.length}
          onChange={setPage}
        />
      </SectionCard>
    </div>
  );
}
