import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Loader2,
  Download,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Filter,
  FileQuestion,
  ArrowRight,
  ShieldAlert,
  BarChart3,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatusPill from "../components/StatusPill";
import Restricted from "../components/Restricted";
import Pagination from "../components/Pagination";
import { STATUS, QUEUE_STATUSES, isPending } from "../data/workflow";
import {
  PERMISSION as P,
  can,
  maskEmail,
  getQueueLabel,
} from "../data/roles";
import { downloadCsv } from "../utils/csv";
import {
  SLA_BUSINESS_DAYS,
  SLA_STYLE,
  businessDaysSince,
  slaLevel,
} from "../utils/sla";
import { detectClaimAnomalies, buildDuplicateIndex } from "../utils/anomalyDetector";

// ตัวกรองพิเศษ: คำขอที่ผู้ตรวจสอบขอให้ผู้อนุมัติตรวจสอบหลักฐาน (ยังเป็นสถานะ 2 · claim.escalation มาจาก App)
const ESCALATED = "ESCALATED";
const ESCALATED_STYLE = { label: "ขอให้ตรวจสอบหลักฐาน", bg: "#F3EFFC", fg: "#6D4BC2" };
const cardStyle = (key) => (key === ESCALATED ? ESCALATED_STYLE : STATUS_STYLE[key]);

const SUMMARY = [
  STATUS.SUBMITTED,
  STATUS.REVIEWED,
  STATUS.RETURNED,
  STATUS.APPROVED,
  STATUS.PAID,
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
 * [V4] คิวตรวจสอบและอนุมัติ (Verification & Reporting - FR7 & TC2)
 *  - ค้นหา กรอง จัดกลุ่ม แยกรายการที่ถูกต้องออกจากรายการที่ต้องแก้ไข
 *  - ระบบตรวจสอบความผิดปกติอัตโนมัติ (คำขอซ้ำ, ข้อมูลไม่ครบ, ทับซ้อน, เกินโควตา)
 *  - ผู้อนุมัติเห็นป้ายคำขอที่ผู้ตรวจสอบขอให้ตรวจสอบหลักฐาน
 */
export default function ReviewQueue({
  user,
  claims = [],
  loading = false,
  error = "",
  onReload,
  goDetail,
  goReport,
  initialStatus = null,
}) {
  const defaultStatus = can(user, P.CLAIM_APPROVE)
    ? STATUS.REVIEWED
    : can(user, P.CLAIM_REVIEW)
      ? STATUS.SUBMITTED
      : "All";

  const [statusFilter, setStatusFilter] = useState(initialStatus || defaultStatus);
  const [termFilter, setTermFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All"); // All | TEACHER | TA
  const [claimantFilter, setClaimantFilter] = useState("All");
  const [anomalyFilter, setAnomalyFilter] = useState("All"); // All | anomalies | clean
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const canSeeFinance = can(user, P.FINANCE_VIEW);
  const canSeePii = can(user, P.PII_VIEW);
  const canExport = can(user, P.DATA_EXPORT);
  const isApprover = can(user, P.CLAIM_APPROVE);
  const readyStatus = isApprover ? STATUS.REVIEWED : STATUS.SUBMITTED;

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

  const claimantOptions = useMemo(
    () =>
      [...new Set(queue.map((c) => c.claimantName).filter(Boolean))].sort(),
    [queue]
  );

  // Compute anomaly check for each claim in queue
  // [V4 scaling] สร้างดัชนีคำขอซ้ำครั้งเดียว แล้วส่งให้ทุกคำขอใช้ร่วมกัน
  // เปลี่ยนการตรวจทั้งคิวจาก O(n²) เป็น O(n) รองรับคำขอจำนวนมากได้ลื่นขึ้น
  const anomalyMap = useMemo(() => {
    const duplicateIndex = buildDuplicateIndex(queue);
    const map = new Map();
    queue.forEach((c) => {
      map.set(c.id, detectClaimAnomalies(c, queue, [], null, { duplicateIndex }));
    });
    return map;
  }, [queue]);

  const scoped = useMemo(
    () =>
      queue.filter((c) => {
        if (termFilter !== "All" && c.termLabel !== termFilter) return false;
        if (courseFilter !== "All" && c.courseCode !== courseFilter) return false;
        if (claimantFilter !== "All" && c.claimantName !== claimantFilter) return false;
        if (roleFilter !== "All") {
          const r = String(c.claimantRole || "").toUpperCase();
          if (roleFilter === "TA" && !r.includes("TA")) return false;
          if (roleFilter === "TEACHER" && (r.includes("TA") || (!r.includes("TEACHER") && !r.includes("INSTRUCTOR"))))
            return false;
        }
        return true;
      }),
    [queue, termFilter, courseFilter, claimantFilter, roleFilter]
  );

  const counts = useMemo(() => {
    const result = {};
    scoped.forEach((c) => {
      result[c.status] = (result[c.status] || 0) + 1;
    });
    return result;
  }, [scoped]);

  // Statistics for anomalies (TC2)
  const anomalyStats = useMemo(() => {
    const withIssues = scoped.filter((c) => anomalyMap.get(c.id)?.hasIssues);
    const cleanSubmitted = scoped.filter(
      (c) => anomalyMap.get(c.id)?.clean && c.status === readyStatus
    );
    const duplicates = withIssues.filter((c) =>
      anomalyMap.get(c.id)?.anomalies.some((a) => a.type === "DUPLICATE")
    );
    const missingEv = withIssues.filter((c) =>
      anomalyMap.get(c.id)?.anomalies.some((a) => a.type === "MISSING_EVIDENCE")
    );

    return {
      totalIssues: withIssues.length,
      cleanCount: cleanSubmitted.length,
      duplicatesCount: duplicates.length,
      missingEvCount: missingEv.length,
    };
  }, [scoped, anomalyMap, readyStatus]);

  const overdueCount = useMemo(
    () =>
      scoped.filter(
        (c) =>
          isPending(c.status) &&
          slaLevel(businessDaysSince(c.submittedAt || c.createdAt)) === "overdue"
      ).length,
    [scoped]
  );

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return scoped
      .filter((c) =>
        statusFilter === ESCALATED
          ? c.escalation
          : statusFilter === "All" || c.status === statusFilter
      )
      .filter((c) => {
        if (anomalyFilter === "anomalies") {
          return anomalyMap.get(c.id)?.hasIssues;
        }
        if (anomalyFilter === "clean") {
          return anomalyMap.get(c.id)?.clean;
        }
        return true;
      })
      .filter(
        (c) =>
          !keyword ||
          [c.code, c.id, c.courseCode, c.courseName, c.claimantName, c.claimantEmail]
            .map((v) => String(v || "").toLowerCase())
            .some((v) => v.includes(keyword))
      )
      .sort(
        (a, b) =>
          new Date(a.submittedAt || a.createdAt || 0).getTime() -
          new Date(b.submittedAt || b.createdAt || 0).getTime()
      );
  }, [scoped, statusFilter, anomalyFilter, query, anomalyMap]);

  const escalatedCount = useMemo(
    () => scoped.filter((c) => c.escalation).length,
    [scoped]
  );

  // การ์ด "ขอให้ตรวจสอบหลักฐาน" ต่อจาก "ตรวจแล้ว รออนุมัติ" (ทุกบทบาทที่เห็นคิว)
  const statusCards = SUMMARY.flatMap((key) =>
    key === STATUS.REVIEWED ? [key, ESCALATED] : [key]
  );

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, termFilter, courseFilter, claimantFilter, roleFilter, anomalyFilter]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const readOnly = !can(user, P.CLAIM_REVIEW) && !can(user, P.CLAIM_APPROVE);

  const filtersActive =
    query ||
    statusFilter !== defaultStatus ||
    termFilter !== "All" ||
    courseFilter !== "All" ||
    claimantFilter !== "All" ||
    roleFilter !== "All" ||
    anomalyFilter !== "All";

  const resetFilters = () => {
    setQuery("");
    setStatusFilter(defaultStatus);
    setTermFilter("All");
    setCourseFilter("All");
    setClaimantFilter("All");
    setRoleFilter("All");
    setAnomalyFilter("All");
  };

  const exportCsv = () => {
    downloadCsv(
      `claims-verification-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "รหัสคำขอ",
        "ผู้ยื่น",
        "บทบาท",
        "อีเมล",
        "รายวิชา",
        "ภาค",
        "ชั่วโมง",
        ...(canSeeFinance ? ["จำนวนเงิน"] : []),
        "วันที่ยื่น",
        "รอมาแล้ว (วันทำการ)",
        "ผลการตรวจสอบความถูกต้อง",
        "สถานะ",
      ],
      rows.map((c) => {
        const check = anomalyMap.get(c.id);
        const anomalyText = check?.clean
          ? "ผ่านเกณฑ์ครบถ้วน"
          : check?.anomalies.map((a) => a.title).join("; ") || "-";

        return [
          c.code || c.id,
          c.claimantName,
          c.claimantRole || "อาจารย์/TA",
          canSeePii ? c.claimantEmail : maskEmail(c.claimantEmail),
          c.courseCode,
          c.termLabel,
          c.hours,
          ...(canSeeFinance ? [c.amount ?? ""] : []),
          formatDate(c.submittedAt || c.createdAt),
          isPending(c.status)
            ? businessDaysSince(c.submittedAt || c.createdAt) ?? ""
            : "",
          anomalyText,
          STATUS_STYLE[c.status]?.label || c.status,
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title={readOnly ? "คำขอทั้งหมด" : `คิว${getQueueLabel(user)}`}
        description={
          readOnly
            ? "ดูสถานะและประวัติการดำเนินการของคำขอ (อ่านอย่างเดียว)"
            : can(user, P.CLAIM_APPROVE)
              ? `พิจารณาอนุมัติคำขอที่ผ่านการตรวจสอบแล้ว หรือส่งกลับให้ผู้ยื่นแก้ไข · กำหนดพิจารณาภายใน ${SLA_BUSINESS_DAYS} วันทำการ`
              : `ตรวจสอบความถูกต้องของคำขอ คัดแยกรายการที่ผิดปกติ ส่งต่อผู้อนุมัติ · กำหนดพิจารณาภายใน ${SLA_BUSINESS_DAYS} วันทำการ`
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

      {/* Anomaly & Verification Breakdown Banner (TC2 & FR7) */}
      <SectionCard hoverable={false} className="p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert size={17} style={{ color: C.teal }} />
              <span>การคัดกรองความผิดปกติของคำขอ</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              ระบบตรวจสอบคำขอซ้ำซ้อน รายการทับซ้อน เอกสารไม่ครบถ้วน และการเบิกเกินโควตาอัตโนมัติ
            </p>
          </div>

          {/* Quick Filter Buttons: All | Issues | Clean */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setAnomalyFilter("All")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                anomalyFilter === "All"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด ({scoped.length})
            </button>

            <button
              type="button"
              onClick={() => setAnomalyFilter("anomalies")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                anomalyFilter === "anomalies"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <AlertTriangle size={13} />
              <span>ตรวจพบข้อผิดปกติ / ต้องแก้ไข ({anomalyStats.totalIssues})</span>
            </button>

            <button
              type="button"
              onClick={() => setAnomalyFilter("clean")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                anomalyFilter === "clean"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <CheckCircle2 size={13} />
              <span>
                ข้อมูลครบถ้วน{isApprover ? "พร้อมอนุมัติ" : "พร้อมส่งต่อ"} ({anomalyStats.cleanCount})
              </span>
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Toolbar: Search & Select Filters (FR8) */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
        <div
          className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1 min-w-[14rem] max-w-md shadow-sm"
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
          className={`${pillClass} min-w-[8rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามภาค"
        >
          <option value="All">ทุกภาคการศึกษา</option>
          {termOptions.map((label) => (
            <option key={label} value={label}>
              ภาค {label}
            </option>
          ))}
        </Select>

        <Select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={`${pillClass} min-w-[8rem]`}
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={`${pillClass} min-w-[8rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามบทบาท"
        >
          <option value="All">ทุกประเภทผู้ยื่น</option>
          <option value="TEACHER">อาจารย์ผู้สอน</option>
          <option value="TA">ผู้ช่วยสอน (TA)</option>
        </Select>

        <Select
          value={claimantFilter}
          onChange={(e) => setClaimantFilter(e.target.value)}
          className={`${pillClass} min-w-[9rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามผู้ยื่น"
        >
          <option value="All">ผู้ยื่นทุกคน</option>
          {claimantOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${pillClass} min-w-[9rem]`}
          style={{ borderColor: C.border, color: C.ink }}
          aria-label="กรองตามสถานะ"
        >
          <option value="All">ทุกสถานะ</option>
          {statusCards.map((key) => (
            <option key={key} value={key}>
              {cardStyle(key).label}
            </option>
          ))}
        </Select>

        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold px-3 py-2 rounded-full border bg-white hover:bg-slate-50 text-teal-800"
            style={{ borderColor: C.border }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Status Summary KPI Cards */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${
          statusCards.length > 6 ? "lg:grid-cols-7" : "lg:grid-cols-6"
        }`}
      >
        {statusCards.map((key) => {
          const style = cardStyle(key);
          const active = statusFilter === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(active ? "All" : key)}
              aria-pressed={active}
              className="rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 border"
              style={{
                background: style.bg,
                borderColor: active ? style.fg : "transparent",
                outline: active ? `2px solid ${style.fg}` : "none",
              }}
            >
              <p className="font-bold text-xs" style={{ color: style.fg }}>
                {style.label}
              </p>
              <p className="text-2xl font-extrabold mt-1 figure" style={{ color: style.fg }}>
                {key === ESCALATED ? escalatedCount : counts[key] || 0}
              </p>
            </button>
          );
        })}
      </div>

      {/* Overdue Warning */}
      {!readOnly && overdueCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm border"
          style={{
            background: SLA_STYLE.overdue.bg,
            color: SLA_STYLE.overdue.fg,
            borderColor: "#F3C9C9",
          }}
          role="status"
        >
          <AlertTriangle size={17} className="shrink-0" />
          <span>
            มีคำขอ{isApprover ? "รออนุมัติ" : "รอตรวจสอบ"}เกินกำหนด {SLA_BUSINESS_DAYS} วันทำการ{" "}
            <b>{overdueCount} รายการ</b> (แสดงอยู่ด้านบนของตาราง)
          </span>
        </div>
      )}

      {/* Main Table */}
      <SectionCard hoverable={false} className="overflow-hidden p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F6F9FB", color: C.sub }}>
                <th className="px-5 py-4 font-semibold text-left">รหัสคำขอ</th>
                <th className="px-5 py-4 font-semibold text-left">ผู้ยื่น & บทบาท</th>
                <th className="px-5 py-4 font-semibold text-left">รายวิชา</th>
                <th className="px-5 py-4 font-semibold text-left">ผลตรวจสอบความถูกต้อง</th>
                <th className="px-5 py-4 font-semibold text-left">ยื่นเมื่อ / รอมาแล้ว</th>
                <th className="px-5 py-4 font-semibold text-right">จำนวนเงิน</th>
                <th className="px-5 py-4 font-semibold text-left">สถานะ</th>
                <th className="pr-5 py-4"></th>
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: C.border }}>
              {pageRows.map((claim) => {
                const submitted = claim.submittedAt || claim.createdAt;
                const waiting = isPending(claim.status) ? businessDaysSince(submitted) : null;
                const sla = SLA_STYLE[slaLevel(waiting)];
                const check = anomalyMap.get(claim.id);

                return (
                  <tr
                    key={claim.id}
                    onClick={() => goDetail?.(claim.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goDetail?.(claim.id);
                    }}
                    tabIndex={0}
                    className="group cursor-pointer hover:bg-[#F8FBFC] focus:bg-[#F8FBFC] outline-none transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold whitespace-nowrap" style={{ color: C.ink }}>
                      <p className="font-extrabold text-teal-800">#{claim.code || claim.id}</p>
                    </td>

                    <td className="px-5 py-4 min-w-[10rem]">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900">{claim.claimantName || "-"}</p>
                        {claim.claimantRole && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: claim.claimantRole.includes("TA") ? "#E8F0FA" : "#F1EFFB",
                              color: claim.claimantRole.includes("TA") ? "#1E5687" : "#6E62C9",
                            }}
                          >
                            {claim.claimantRole.includes("TA") ? "TA" : "อาจารย์"}
                          </span>
                        )}
                      </div>
                      {claim.claimantEmail && (
                        <p className="text-xs text-slate-500 font-mono">
                          {canSeePii ? claim.claimantEmail : maskEmail(claim.claimantEmail)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800">{claim.courseCode || "-"}</p>
                      {claim.courseName && (
                        <p className="text-xs text-slate-500 max-w-[10rem] truncate">{claim.courseName}</p>
                      )}
                    </td>

                    {/* Verification & Anomaly Badge (FR7 & TC2) */}
                    <td className="px-5 py-4">
                      {check?.clean ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} />
                          <span>ข้อมูลถูกต้อง</span>
                        </span>
                      ) : check?.hasErrors ? (
                        <div className="flex flex-col gap-1">
                          {check.anomalies.map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              title={a.message}
                            >
                              <AlertTriangle size={11} className="shrink-0" />
                              <span className="truncate max-w-[12rem]">{a.title}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {check?.anomalies.map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                              title={a.message}
                            >
                              <AlertTriangle size={11} className="shrink-0" />
                              <span className="truncate max-w-[12rem]">{a.title}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-xs text-slate-500">{formatDate(submitted)}</p>
                      {waiting !== null && (
                        <span
                          className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: sla.bg, color: sla.fg }}
                        >
                          รอ {waiting} วันทำการ
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap figure text-right font-extrabold text-slate-900">
                      <Restricted allowed={canSeeFinance} value={claim.amount}>
                        ฿{Number(claim.amount || 0).toLocaleString()}
                      </Restricted>
                    </td>

                    <td className="px-5 py-4">
                      <StatusPill status={claim.status} />
                      {claim.escalation && (
                        <span
                          className="flex w-fit items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
                          style={{ background: "#F3EFFC", borderColor: "#D9CCF5", color: "#6D4BC2" }}
                          title={claim.escalation?.comment || ""}
                        >
                          <FileQuestion size={11} />
                          ขอให้ตรวจสอบหลักฐาน
                        </span>
                      )}
                    </td>

                    <td className="pr-5 py-4 text-right">
                      <ChevronRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1 inline-block"
                        style={{ color: C.sub }}
                      />
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      {loading ? "กำลังโหลดข้อมูลคำขอ..." : "ไม่พบคำขอตามเงื่อนไขที่เลือก"}
                    </p>
                    {!loading && (
                      <p className="text-xs mt-1 text-slate-500">
                        ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด
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
