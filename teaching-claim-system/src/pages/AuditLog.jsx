import React, { useCallback, useEffect, useState } from "react";
import {
  History,
  Search,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import RoleBadge from "../components/RoleBadge";
import { ROLE_META } from "../data/roles";
import { AUDIT_ACTION_META, getAuditMeta } from "../data/workflow";
import { getAuditLogs } from "../services/api";
import { downloadCsv } from "../utils/csv";

const PAGE_SIZE = 50;

const EMPTY_FILTERS = { actor: "", action: "", from: "", to: "" };

function normalizeLog(item, index) {
  return {
    id: item.id ?? `log-${index}`,
    claimId: item.claim_id || item.claimId || "",
    claimCode: item.claim_code || item.claimCode || "",
    action: item.action || "",
    actorName: item.actor_name || item.actorName || "",
    actorRole: item.actor_role || item.actorRole || "",
    toStatus: item.to_status || item.toStatus || "",
    comment: item.comment || "",
    createdAt: item.created_at || item.createdAt || "",
  };
}

function formatDateTime(value) {
  const date = new Date(value);

  return !value || Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

const inputClass =
  "rounded-full border px-4 py-2.5 text-sm bg-white outline-none";

/*
 * [V3] Audit Log รวมทุกคำขอ — ค้นย้อนหลังได้ว่า "ใคร ทำอะไร กับคำขอไหน เมื่อไร"
 * ข้อมูลทั้งหมดมาจาก backend (อ่านอย่างเดียว) หน้านี้ไม่มีทางแก้หรือลบ log
 */
export default function AuditLog() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (filters, nextCursor = null) => {
      setLoading(true);
      setError("");

      try {
        const data = await getAuditLogs({
          ...filters,
          // วันที่สิ้นสุดนับรวมทั้งวัน
          to: filters.to ? `${filters.to}T23:59:59` : "",
          limit: PAGE_SIZE,
          cursor: nextCursor || "",
        });

        const list = (
          Array.isArray(data?.logs)
            ? data.logs
            : Array.isArray(data)
              ? data
              : []
        ).map(normalizeLog);

        setRows((prev) => (nextCursor ? [...prev, ...list] : list));
        setCursor(data?.next_cursor || data?.nextCursor || null);
      } catch (err) {
        if (err?.status === 403) {
          setForbidden(true);
        } else {
          setError(err?.message || "ไม่สามารถโหลดประวัติได้");
        }

        if (!nextCursor) setRows([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(applied);
  }, [applied, load]);

  const invalidRange =
    draft.from && draft.to && draft.from > draft.to;

  const apply = (e) => {
    e.preventDefault();
    if (invalidRange) return;
    setApplied({ ...draft, actor: draft.actor.trim() });
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const exportCsv = () => {
    downloadCsv(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ["เวลา", "ผู้ดำเนินการ", "บทบาท", "การดำเนินการ", "รหัสคำขอ", "สถานะใหม่", "หมายเหตุ"],
      rows.map((r) => [
        r.createdAt,
        r.actorName,
        ROLE_META[r.actorRole]?.label || r.actorRole,
        getAuditMeta(r.action).label,
        r.claimCode || r.claimId,
        STATUS_STYLE[r.toStatus]?.label || r.toStatus,
        r.comment,
      ])
    );
  };

  if (forbidden) {
    return (
      <SectionCard hoverable={false} className="p-10 text-center">
        <p className="text-sm font-medium" style={{ color: C.ink }}>
          คุณไม่มีสิทธิ์ดูประวัติการดำเนินการรวม
        </p>
      </SectionCard>
    );
  }

  return (
    <div>
      <PageHeader
        icon={History}
        title="ประวัติการดำเนินการ"
        description="บันทึกการยื่น ตรวจสอบ อนุมัติ และส่งกลับของทุกคำขอ (อ่านอย่างเดียว)"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load(applied)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: C.border, color: C.tealDark }}
            >
              <RefreshCw size={15} />
              รีเฟรช
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{
                background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
              }}
              title="ส่งออกเฉพาะรายการที่โหลดแล้ว"
            >
              <Download size={15} />
              ส่งออก CSV
            </button>
          </div>
        }
      />

      <form
        onSubmit={apply}
        className="flex flex-col lg:flex-row lg:items-end gap-3 mb-6"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold flex-1 min-w-[12rem]" style={{ color: C.sub }}>
          ผู้ดำเนินการ
          <span
            className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5"
            style={{ borderColor: C.border }}
          >
            <Search size={15} />
            <input
              type="text"
              value={draft.actor}
              onChange={(e) => setDraft({ ...draft, actor: e.target.value })}
              placeholder="ชื่อหรืออีเมล"
              className="outline-none text-sm w-full bg-transparent font-normal"
              style={{ color: C.ink }}
            />
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: C.sub }}>
          การดำเนินการ
          <Select
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
            className={`${inputClass} min-w-[11rem] font-normal`}
            style={{ borderColor: C.border, color: C.ink }}
          >
            <option value="">ทั้งหมด</option>
            {Object.entries(AUDIT_ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: C.sub }}>
          ตั้งแต่วันที่
          <input
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            className={`${inputClass} font-normal`}
            style={{ borderColor: C.border, color: C.ink }}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: C.sub }}>
          ถึงวันที่
          <input
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            className={`${inputClass} font-normal`}
            style={{ borderColor: C.border, color: C.ink }}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={invalidRange || loading}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: C.tealDark }}
          >
            ค้นหา
          </button>

          <button
            type="button"
            onClick={reset}
            className="px-4 py-2.5 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80"
            style={{ borderColor: C.border, color: C.ink }}
          >
            ล้าง
          </button>
        </div>
      </form>

      {invalidRange && (
        <p className="text-xs mb-3" style={{ color: C.rose }}>
          วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด
        </p>
      )}

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-2xl mb-4"
          style={{ background: C.roseSoft, color: "#C23B3B" }}
          role="alert"
        >
          {error}
        </p>
      )}

      <SectionCard hoverable={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: C.sub }}>
                {["เวลา", "ผู้ดำเนินการ", "การดำเนินการ", "คำขอ", "ผลลัพธ์", "หมายเหตุ"].map((h) => (
                  <th key={h} className="px-5 py-4 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const meta = getAuditMeta(row.action);
                const status = STATUS_STYLE[row.toStatus];

                return (
                  <tr
                    key={row.id}
                    className="border-t align-top"
                    style={{ borderColor: C.border }}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: C.sub }}>
                      {formatDateTime(row.createdAt)}
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium" style={{ color: C.ink }}>
                        {row.actorName || "ระบบ"}
                      </p>
                      {ROLE_META[row.actorRole] && (
                        <RoleBadge roleKey={row.actorRole} />
                      )}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap font-semibold" style={{ color: C.ink }}>
                      {meta.label}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: C.ink }}>
                      {row.claimCode ? `#${row.claimCode}` : String(row.claimId).slice(0, 8).toUpperCase() || "-"}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {status ? (
                        <span
                          className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: status.bg, color: status.fg }}
                        >
                          {status.label}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td
                      className="px-5 py-3.5 max-w-xs whitespace-pre-wrap break-words"
                      style={{ color: C.ink }}
                    >
                      {row.comment || "-"}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: C.sub }}>
                    {loading ? "กำลังโหลด..." : "ไม่พบรายการตามเงื่อนไข"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {cursor && (
          <div className="p-4 text-center border-t" style={{ borderColor: C.border }}>
            <button
              type="button"
              onClick={() => load(applied, cursor)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: C.border, color: C.tealDark }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              โหลดเพิ่ม
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
