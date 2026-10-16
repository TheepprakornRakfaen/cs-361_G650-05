import React, { useMemo, useState } from "react";
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatusPill from "../components/StatusPill";
import Restricted from "../components/Restricted";
import { STATUS, QUEUE_STATUSES } from "../data/workflow";
import {
  PERMISSION as P,
  can,
  maskEmail,
} from "../data/roles";

const SUMMARY = [
  STATUS.SUBMITTED,
  STATUS.RETURNED,
  STATUS.APPROVED,
];

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

/*
 * [V3] คิวตรวจสอบ / อนุมัติ
 *  - เจ้าหน้าที่/ผู้อนุมัติ/ผู้ดูแล: เปิดมาที่ "รอตรวจสอบ" แล้วตรวจสอบ+อนุมัติในขั้นตอนเดียว
 *  - ผู้ดูแลระบบ: เห็นทั้งหมด (อ่านอย่างเดียว)
 * รายการที่เห็นถูกจำกัดโดย backend ตาม role อยู่แล้ว หน้านี้เป็นเพียงตัวกรองเพื่อการแสดงผล
 */
export default function ReviewQueue({
  user,
  claims = [],
  loading = false,
  error = "",
  onReload,
  goDetail,
}) {
  // ผู้มีสิทธิ์ตรวจสอบ/อนุมัติ เปิดมาที่ "รอตรวจสอบ" เลย
  const defaultStatus =
    can(user, P.CLAIM_REVIEW) || can(user, P.CLAIM_APPROVE)
      ? STATUS.SUBMITTED
      : "All";

  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [query, setQuery] = useState("");

  const canSeeFinance = can(user, P.FINANCE_VIEW);
  const canSeePii = can(user, P.PII_VIEW);

  // แบบร่างของผู้อื่นไม่เกี่ยวกับคิว
  const queue = useMemo(
    () => claims.filter((c) => QUEUE_STATUSES.includes(c.status)),
    [claims]
  );

  const counts = useMemo(() => {
    const result = {};
    queue.forEach((c) => {
      result[c.status] = (result[c.status] || 0) + 1;
    });
    return result;
  }, [queue]);

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return queue
      .filter((c) => statusFilter === "All" || c.status === statusFilter)
      .filter(
        (c) =>
          !keyword ||
          [c.code, c.id, c.courseCode, c.courseName, c.claimantName]
            .map((v) => String(v || "").toLowerCase())
            .some((v) => v.includes(keyword))
      )
      // เก่าสุดก่อน = งานที่รอนานที่สุดอยู่บน
      .sort(
        (a, b) =>
          new Date(a.submittedAt || a.createdAt || 0).getTime() -
          new Date(b.submittedAt || b.createdAt || 0).getTime()
      );
  }, [queue, statusFilter, query]);

  const readOnly = !can(user, P.CLAIM_REVIEW) && !can(user, P.CLAIM_APPROVE);

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title={readOnly ? "คำขอทั้งหมด" : "คิวตรวจสอบและอนุมัติ"}
        description={
          readOnly
            ? "ดูสถานะและประวัติการดำเนินการของคำขอ (อ่านอย่างเดียว)"
            : "เลือกคำขอเพื่อตรวจสอบเอกสาร และพิจารณาตามลำดับขั้น"
        }
        action={
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: C.border, color: C.tealDark }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            รีเฟรช
          </button>
        }
      />

      {/* สรุปตามสถานะ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {SUMMARY.map((key) => {
          const style = STATUS_STYLE[key];
          const active = statusFilter === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(active ? "All" : key)}
              aria-pressed={active}
              className="rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: style.bg,
                outline: active ? `2px solid ${style.fg}` : "none",
              }}
            >
              <p className="text-sm font-bold" style={{ color: style.fg }}>
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

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
        <div
          className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1 max-w-md"
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none min-w-[12rem]"
          style={{ borderColor: C.border, color: C.ink }}
        >
          <option value="All">ทุกสถานะ</option>

          {SUMMARY.map((key) => (
            <option key={key} value={key}>
              {STATUS_STYLE[key].label}
            </option>
          ))}
        </Select>
      </div>

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
                  "รหัสคำขอ",
                  "ผู้ยื่น",
                  "รายวิชา",
                  "วันที่ยื่น",
                  "จำนวนเงิน",
                  "สถานะ",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => goDetail?.(claim.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goDetail?.(claim.id);
                  }}
                  tabIndex={0}
                  className="border-t cursor-pointer hover:bg-[#F8FBFC] focus:bg-[#F8FBFC] outline-none transition-colors"
                  style={{ borderColor: C.border }}
                >
                  <td
                    className="px-6 py-4 font-semibold whitespace-nowrap"
                    style={{ color: C.ink }}
                  >
                    #{claim.code || claim.id}
                  </td>

                  <td className="px-6 py-4">
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

                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    style={{ color: C.ink }}
                  >
                    {claim.courseCode || "-"}
                  </td>

                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    style={{ color: C.sub }}
                  >
                    {formatDate(claim.submittedAt || claim.createdAt)}
                  </td>

                  <td
                    className="px-6 py-4 whitespace-nowrap figure"
                    style={{ color: C.ink }}
                  >
                    <Restricted
                      allowed={canSeeFinance}
                      value={claim.amount}
                    >
                      ฿{Number(claim.amount || 0).toLocaleString()}
                    </Restricted>
                  </td>

                  <td className="px-6 py-4">
                    <StatusPill status={claim.status} />
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: C.ink }}
                    >
                      {loading ? "กำลังโหลด..." : "ไม่มีคำขอในรายการนี้"}
                    </p>

                    {!loading && (
                      <p className="text-xs mt-1" style={{ color: C.sub }}>
                        ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ
                      </p>
                    )}
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