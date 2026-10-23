import React, { useMemo, useState } from "react";
import { BarChart3, RefreshCw, Loader2, Download } from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import { STATUS } from "../data/workflow";
import { PERMISSION as P, can } from "../data/roles";
import { COMP_TYPES, getCompType } from "../services/claimMapper";
import { downloadCsv } from "../utils/csv";
import { formatDuration } from "../utils/time";

/*
 * รายงานสรุปยอดเบิก (ผู้ตรวจสอบ / ผู้อนุมัติ / ผู้ดูแลระบบ)
 * สรุปตามประเภทค่าตอบแทน (อาจารย์ / TA) และช่วงเวลา กรองได้ ส่งออก CSV ได้ (ต้องมีสิทธิ์ data.export)
 *
 * คำนวณจากรายการคำขอจริงที่ผู้ใช้มีสิทธิ์เห็น (ไม่มีข้อมูลจำลอง)
 * ⚠️ backend ต้องกรองข้อมูลและตรวจสิทธิ์ทุก request
 */

const baht = (value) =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const dateOnly = (value) => {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

const claimDate = (claim) =>
  dateOnly(claim.submittedAt || claim.createdAt || "");

// กลุ่มสถานะสำหรับรายงาน (เรียงตามลำดับกระบวนการ)
const STATUS_GROUPS = [
  {
    key: "inReview",
    label: "รอตรวจสอบ/อนุมัติ",
    statuses: [STATUS.SUBMITTED, STATUS.REVIEWED],
    color: "#9A7B06",
  },
  {
    key: "toFinance",
    label: "อนุมัติแล้ว รอจ่ายเงิน",
    statuses: [STATUS.APPROVED],
    color: "#1E8E4F",
  },
  {
    key: "paid",
    label: "จ่ายเงินแล้ว",
    statuses: [STATUS.PAID],
    color: "#136B3A",
  },
  {
    key: "stopped",
    label: "ส่งกลับ/ไม่อนุมัติ",
    statuses: [STATUS.RETURNED, STATUS.REJECTED],
    color: "#B4531A",
  },
];

const groupOf = (status) =>
  STATUS_GROUPS.find((g) => g.statuses.includes(status))?.key || "other";

const sumBy = (list, pick) =>
  list.reduce((total, item) => total + Number(pick(item) || 0), 0);

const FIELD =
  "rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none";

function Stat({ label, value, hint, tone = C.ink, icon: Icon }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 bg-white"
      style={{ borderColor: C.border }}
    >
      <p className="flex items-center gap-1.5 text-xs" style={{ color: C.sub }}>
        {Icon && <Icon size={13} />}
        {label}
      </p>

      <p className="text-2xl font-extrabold figure mt-0.5" style={{ color: tone }}>
        {value}
      </p>

      {hint && (
        <p className="text-[11px] mt-0.5" style={{ color: C.sub }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* =========================
 * รายงานสรุปยอดเบิก (ตามประเภทค่าตอบแทนและช่วงเวลา)
 * ========================= */
function SummaryReport({ claims, canExport }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [term, setTerm] = useState("All");
  const [compType, setCompType] = useState("All");
  const [group, setGroup] = useState("All");

  const terms = useMemo(
    () =>
      [...new Set(claims.map((c) => c.termLabel).filter(Boolean))]
        .sort()
        .reverse(),
    [claims]
  );

  const filtered = useMemo(
    () =>
      claims.filter((c) => {
        if (c.status === STATUS.DRAFT || c.status === STATUS.UNKNOWN) return false;
        if (term !== "All" && c.termLabel !== term) return false;
        if (compType !== "All" && getCompType(c.claimantRole) !== compType) return false;
        if (group !== "All" && groupOf(c.status) !== group) return false;

        const day = claimDate(c);

        if (from && (!day || day < from)) return false;
        if (to && (!day || day > to)) return false;

        return true;
      }),
    [claims, from, to, term, compType, group]
  );

  // ตาราง: แถว = ประเภทค่าตอบแทน, คอลัมน์ = กลุ่มสถานะ
  const byType = useMemo(
    () =>
      Object.keys(COMP_TYPES)
        .map((type) => {
          const list = filtered.filter((c) => getCompType(c.claimantRole) === type);

          return {
            type,
            label: COMP_TYPES[type],
            count: list.length,
            hours: sumBy(list, (c) => c.hours),
            amount: sumBy(list, (c) => c.amount),
            cells: Object.fromEntries(
              STATUS_GROUPS.map((g) => {
                const inGroup = list.filter((c) => groupOf(c.status) === g.key);
                return [
                  g.key,
                  { count: inGroup.length, amount: sumBy(inGroup, (c) => c.amount) },
                ];
              })
            ),
          };
        })
        .filter((row) => row.count > 0),
    [filtered]
  );

  // ตาราง: แถว = ภาค + เดือนของรอบการยื่น
  const byPeriod = useMemo(() => {
    const map = new Map();

    filtered.forEach((c) => {
      const key = `${c.termLabel || "-"}|${c.periodMonth ?? ""}`;
      const row = map.get(key) || {
        key,
        term: c.termLabel || "-",
        month: c.periodMonth ?? "-",
        count: 0,
        hours: 0,
        amount: 0,
        paid: 0,
      };

      row.count += 1;
      row.hours += Number(c.hours || 0);
      row.amount += Number(c.amount || 0);
      if (c.status === STATUS.PAID) row.paid += Number(c.amount || 0);

      map.set(key, row);
    });

    return [...map.values()].sort((a, b) =>
      `${b.term}${String(b.month).padStart(2, "0")}`.localeCompare(
        `${a.term}${String(a.month).padStart(2, "0")}`
      )
    );
  }, [filtered]);

  const totals = {
    count: filtered.length,
    hours: sumBy(filtered, (c) => c.hours),
    amount: sumBy(filtered, (c) => c.amount),
    paid: sumBy(
      filtered.filter((c) => c.status === STATUS.PAID),
      (c) => c.amount
    ),
    pendingPay: sumBy(
      filtered.filter((c) => c.status === STATUS.APPROVED),
      (c) => c.amount
    ),
  };

  const hasFilter =
    from || to || term !== "All" || compType !== "All" || group !== "All";

  const clear = () => {
    setFrom("");
    setTo("");
    setTerm("All");
    setCompType("All");
    setGroup("All");
  };

  const exportSummary = () => {
    const rows = [];

    byType.forEach((row) => {
      STATUS_GROUPS.forEach((g) => {
        const cell = row.cells[g.key];

        if (cell.count > 0) {
          rows.push([row.label, g.label, cell.count, cell.amount]);
        }
      });
    });

    rows.push(["รวมทั้งหมด", "", totals.count, totals.amount]);

    downloadCsv(
      `finance-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      ["ประเภทค่าตอบแทน", "สถานะ", "จำนวนคำขอ", "จำนวนเงิน (บาท)"],
      rows
    );
  };

  const exportDetail = () => {
    downloadCsv(
      `finance-claims-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "รหัสคำขอ",
        "ประเภทค่าตอบแทน",
        "ผู้ยื่น",
        "รายวิชา",
        "ภาค",
        "เดือนของรอบ",
        "วันที่ยื่น",
        "ชั่วโมง",
        "จำนวนเงิน",
        "สถานะ",
        "วันที่จ่าย",
      ],
      filtered.map((c) => [
        c.code || c.id,
        COMP_TYPES[getCompType(c.claimantRole)],
        c.claimantName,
        c.courseCode,
        c.termLabel,
        c.periodMonth ?? "",
        claimDate(c),
        c.hours,
        c.amount ?? "",
        STATUS_STYLE[c.status]?.label || c.status,
        dateOnly(c.paidAt),
      ])
    );
  };

  return (
    <div className="space-y-5">
      <SectionCard className="p-5" hoverable={false}>
        <p className="text-sm font-bold mb-3" style={{ color: C.ink }}>
          เงื่อนไขรายงาน
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold" style={{ color: C.sub }}>
            ยื่นตั้งแต่วันที่
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className={`${FIELD} block mt-1`}
              style={{ borderColor: C.border, color: C.ink }}
            />
          </label>

          <label className="text-xs font-semibold" style={{ color: C.sub }}>
            ถึงวันที่
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={`${FIELD} block mt-1`}
              style={{ borderColor: C.border, color: C.ink }}
            />
          </label>

          <Select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className={`${FIELD} min-w-[9.5rem]`}
            style={{ borderColor: C.border, color: C.ink }}
            aria-label="ภาคการศึกษา"
          >
            <option value="All">ทุกภาคการศึกษา</option>
            {terms.map((t) => (
              <option key={t} value={t}>
                ภาค {t}
              </option>
            ))}
          </Select>

          <Select
            value={compType}
            onChange={(e) => setCompType(e.target.value)}
            className={`${FIELD} min-w-[11rem]`}
            style={{ borderColor: C.border, color: C.ink }}
            aria-label="ประเภทค่าตอบแทน"
          >
            <option value="All">ทุกประเภทค่าตอบแทน</option>
            {Object.entries(COMP_TYPES)
              .filter(([key]) => key !== "OTHER")
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </Select>

          <Select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className={`${FIELD} min-w-[11rem]`}
            style={{ borderColor: C.border, color: C.ink }}
            aria-label="สถานะ"
          >
            <option value="All">ทุกสถานะ</option>
            {STATUS_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </Select>

          {hasFilter && (
            <button
              type="button"
              onClick={clear}
              className="text-sm font-semibold underline underline-offset-2 pb-2.5"
              style={{ color: C.tealDark }}
            >
              ล้างเงื่อนไข
            </button>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="จำนวนคำขอ"
          value={totals.count}
          hint={formatDuration(totals.hours * 60)}
        />
        <Stat label="ยอดเบิกรวม" value={`฿${baht(totals.amount)}`} tone={C.tealDark} />
        <Stat
          label="อนุมัติแล้ว รอจ่ายเงิน"
          value={`฿${baht(totals.pendingPay)}`}
          tone="#0F6F7C"
        />
        <Stat label="จ่ายแล้ว" value={`฿${baht(totals.paid)}`} tone="#136B3A" />
      </div>

      <SectionCard className="p-5" hoverable={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm font-bold" style={{ color: C.ink }}>
            สรุปยอดเบิกตามประเภทค่าตอบแทน
          </p>

          {canExport && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportSummary}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: C.border, color: C.tealDark }}
              >
                <Download size={14} />
                CSV สรุปยอด
              </button>

              <button
                type="button"
                onClick={exportDetail}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: C.border, color: C.tealDark }}
              >
                <Download size={14} />
                CSV รายคำขอ
              </button>
            </div>
          )}
        </div>

        {byType.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: C.sub }}>
            ไม่พบคำขอตามเงื่อนไขที่เลือก
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: C.border }}>
            <table className="w-full text-sm">
              <thead style={{ background: "#F7FAFC", color: C.sub }}>
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">
                    ประเภทค่าตอบแทน
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">คำขอ</th>
                  {STATUS_GROUPS.map((g) => (
                    <th
                      key={g.key}
                      className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap"
                    >
                      {g.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">
                    รวม (บาท)
                  </th>
                </tr>
              </thead>

              <tbody>
                {byType.map((row) => (
                  <tr key={row.type} className="border-t" style={{ borderColor: C.border }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: C.ink }}>
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-right figure">{row.count}</td>
                    {STATUS_GROUPS.map((g) => (
                      <td
                        key={g.key}
                        className="px-4 py-3 text-right figure"
                        style={{ color: row.cells[g.key].count ? g.color : C.sub }}
                      >
                        {row.cells[g.key].count
                          ? `${baht(row.cells[g.key].amount)} (${row.cells[g.key].count})`
                          : "-"}
                      </td>
                    ))}
                    <td
                      className="px-4 py-3 text-right figure font-bold"
                      style={{ color: C.tealDark }}
                    >
                      {baht(row.amount)}
                    </td>
                  </tr>
                ))}

                <tr className="border-t" style={{ borderColor: C.border, background: "#F7FAFC" }}>
                  <td className="px-4 py-3 font-extrabold">รวมทั้งหมด</td>
                  <td className="px-4 py-3 text-right figure font-bold">{totals.count}</td>
                  {STATUS_GROUPS.map((g) => {
                    const list = filtered.filter((c) => groupOf(c.status) === g.key);

                    return (
                      <td key={g.key} className="px-4 py-3 text-right figure font-bold">
                        {list.length
                          ? `${baht(sumBy(list, (c) => c.amount))} (${list.length})`
                          : "-"}
                      </td>
                    );
                  })}
                  <td
                    className="px-4 py-3 text-right figure font-extrabold"
                    style={{ color: C.tealDark }}
                  >
                    {baht(totals.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard className="p-5" hoverable={false}>
        <p className="text-sm font-bold mb-4" style={{ color: C.ink }}>
          สรุปยอดเบิกตามช่วงเวลา (ภาคการศึกษา / เดือนของรอบการยื่น)
        </p>

        {byPeriod.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: C.sub }}>
            ไม่พบคำขอตามเงื่อนไขที่เลือก
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: C.border }}>
            <table className="w-full text-sm">
              <thead style={{ background: "#F7FAFC", color: C.sub }}>
                <tr>
                  {[
                    "ภาค",
                    "เดือนของรอบ",
                    "คำขอ",
                    "เวลารวม",
                    "ยอดเบิก (บาท)",
                    "จ่ายแล้ว (บาท)",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap ${
                        i > 1 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {byPeriod.map((row) => (
                  <tr key={row.key} className="border-t" style={{ borderColor: C.border }}>
                    <td className="px-4 py-3">{row.term}</td>
                    <td className="px-4 py-3">
                      {row.month === "-" ? "-" : `เดือน ${row.month}`}
                    </td>
                    <td className="px-4 py-3 text-right figure">{row.count}</td>
                    <td className="px-4 py-3 text-right figure">
                      {formatDuration(row.hours * 60)}
                    </td>
                    <td className="px-4 py-3 text-right figure font-semibold">
                      {baht(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-right figure" style={{ color: "#136B3A" }}>
                      {baht(row.paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function Report({
  user,
  claims = [],
  loading = false,
  error = "",
  onReload,
}) {
  const canExport = can(user, P.DATA_EXPORT);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        icon={BarChart3}
        title="รายงานสรุปยอดเบิก"
        description="สรุปยอดเบิกตามประเภทค่าตอบแทนและช่วงเวลา"
        action={
          onReload && (
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold bg-white hover:bg-[#E8F0FA] disabled:opacity-60"
              style={{ borderColor: C.border, color: C.tealDark }}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              รีเฟรช
            </button>
          )
        }
      />

      {error && (
        <div
          className="px-4 py-3 rounded-2xl text-sm"
          style={{ background: C.roseSoft, color: "#C23B3B" }}
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && claims.length === 0 ? (
        <SectionCard className="p-10 text-center" hoverable={false}>
          <Loader2
            size={28}
            className="mx-auto mb-3 animate-spin"
            style={{ color: C.sub }}
          />
          <p className="text-sm font-medium" style={{ color: C.ink }}>
            กำลังโหลดข้อมูล...
          </p>
        </SectionCard>
      ) : (
        <SummaryReport claims={claims} canExport={canExport} />
      )}
    </div>
  );
}
