import React from "react";
import { RefreshCw, Lock, History } from "lucide-react";
import { C } from "../theme";
import { getAuditMeta, stripEscalateTag } from "../data/workflow";
import { STATUS_STYLE } from "../theme";
import { ROLE_META } from "../data/roles";
import RoleBadge from "./RoleBadge";

const TONE = {
  neutral: "#8FA3AD",
  teal: C.teal,
  green: "#1E8E4F",
  red: C.rose,
  amber: "#E8873A",
  violet: "#6D4BC2",
};

function formatDateTime(value) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
 * GET /api/claims/{id}/history อาจส่ง snake_case หรือ camelCase
 */
export function normalizeHistory(item, index) {
  return {
    id: item.id ?? item.audit_id ?? `h-${index}`,
    action: item.action || item.event || "",
    actorName: item.actor_name || item.actorName || item.actor || "",
    actorRole: item.actor_role || item.actorRole || "",
    fromStatus: item.from_status || item.fromStatus || "",
    toStatus: item.to_status || item.toStatus || "",
    comment: item.comment || item.reason || "",
    createdAt: item.created_at || item.createdAt || item.timestamp || "",
  };
}

/*
 * [V3] ประวัติการดำเนินการของคำขอ — ใหม่สุดอยู่บน
 * state: loading / error (403 = ไม่มีสิทธิ์) / empty / list
 */
export default function AuditTimeline({
  items = [],
  loading = false,
  error = "",
  forbidden = false,
  onRetry,
}) {
  if (forbidden) {
    return (
      <p className="flex items-center gap-2 text-sm" style={{ color: C.sub }}>
        <Lock size={14} />
        คุณไม่มีสิทธิ์ดูประวัติการดำเนินการของคำขอนี้
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm" style={{ color: C.sub }}>
        กำลังโหลดประวัติ...
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm" style={{ color: C.rose }}>
          {error}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-opacity hover:opacity-80"
            style={{ borderColor: C.border, color: C.tealDark }}
          >
            <RefreshCw size={13} />
            ลองใหม่
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm" style={{ color: C.sub }}>
        <History size={14} />
        ยังไม่มีประวัติการดำเนินการ
      </p>
    );
  }

  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  return (
    <ol className="relative">
      {sorted.map((item, index) => {
        const meta = getAuditMeta(item.action, item.comment);
        const comment = stripEscalateTag(item.comment);
        const last = index === sorted.length - 1;
        const toLabel = STATUS_STYLE[item.toStatus]?.label;

        return (
          <li key={item.id} className="relative pl-8 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-4 bottom-0 w-[2px]"
                style={{ background: C.border }}
              />
            )}

            <span
              aria-hidden="true"
              className="absolute left-0 top-1 w-4 h-4 rounded-full border-[3px] bg-white"
              style={{ borderColor: TONE[meta.tone] }}
            />

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {meta.label}
              </p>

              {toLabel && (
                <span className="text-xs" style={{ color: C.sub }}>
                  → {toLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: C.sub }}>
                {item.actorName || "ระบบ"}
              </span>

              {ROLE_META[item.actorRole] && (
                <RoleBadge roleKey={item.actorRole} />
              )}

              <span className="text-xs" style={{ color: C.sub }}>
                · {formatDateTime(item.createdAt)}
              </span>
            </div>

            {comment && (
              <p
                className="text-sm mt-2 px-3 py-2 rounded-xl leading-6 whitespace-pre-wrap break-words"
                style={{ background: "#F4F8FB", color: C.ink }}
              >
                {comment}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
