import React, { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  Clock,
  Megaphone,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import { timeAgo } from "../data/notifications";

const KIND_STYLE = {
  approved: { icon: CheckCircle2, bg: "#DFF5E6", fg: "#1E8E4F" },
  rejected: { icon: XCircle, bg: "#FBE2E2", fg: "#C23B3B" },
  pending: { icon: Clock, bg: "#FEF6D8", fg: "#9A7B06" },
  news: { icon: Megaphone, bg: C.tealSoft, fg: C.tealDark },
};

const TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "claim", label: "คำขอของฉัน" },
  { id: "news", label: "ข่าวสาร" },
];

export default function Notifications({
  notifications = [],
  readIds = [],
  onRead,
  onReadAll,
  goDetail,
}) {
  const [tab, setTab] = useState("all");

  const isRead = (n) => readIds.includes(n.id);
  const unreadTotal = notifications.filter((n) => !isRead(n)).length;

  const countOf = (id) =>
    notifications.filter((n) => (id === "all" ? true : n.type === id) && !isRead(n)).length;

  const visible = useMemo(
    () => notifications.filter((n) => tab === "all" || n.type === tab),
    [notifications, tab],
  );

  const open = (n) => {
    onRead && onRead(n.id);
    if (n.type === "claim" && goDetail) goDetail(n.claimId);
  };

  return (
    <div className="w-full max-w-3xl mx-auto" style={{ animation: "fadein 0.4s ease-out" }}>
      <PageHeader
        icon={Bell}
        title="การแจ้งเตือน"
        description={
          unreadTotal > 0
            ? `มี ${unreadTotal} รายการที่ยังไม่ได้อ่าน`
            : "ไม่มีรายการใหม่"
        }
        action={
          <button
            type="button"
            onClick={onReadAll}
            disabled={unreadTotal === 0}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border transition-colors hover:bg-[#E8F0FA] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            style={{ borderColor: C.border, color: C.tealDark }}
          >
            <CheckCheck size={16} />
            อ่านทั้งหมดแล้ว
          </button>
        }
      />

      {/* แท็บกรอง */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const active = tab === t.id;
          const n = countOf(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
              style={{
                background: active ? C.tealDark : "#FFFFFF",
                color: active ? "#FFFFFF" : C.ink,
                borderColor: active ? C.tealDark : C.border,
              }}
            >
              {t.label}
              {n > 0 && (
                <span
                  className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center"
                  style={{
                    background: active ? "rgba(255,255,255,0.25)" : C.rose,
                    color: "#FFFFFF",
                  }}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <SectionCard className="overflow-hidden" hoverable={false}>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-14">
            <BellOff size={34} style={{ color: C.sub }} className="mb-3" />
            <p className="font-semibold text-sm" style={{ color: C.ink }}>
              ยังไม่มีการแจ้งเตือน
            </p>
            <p className="text-xs mt-1" style={{ color: C.sub }}>
              เมื่อคำขอได้รับการอนุมัติหรือมีข่าวสารใหม่ จะแสดงที่นี่
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((n, i) => {
              const s = KIND_STYLE[n.kind] || KIND_STYLE.news;
              const Icon = s.icon;
              const unread = !isRead(n);
              return (
                <li
                  key={n.id}
                  style={{
                    borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className="w-full text-left flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[#F5F9FD]"
                    style={{ background: unread ? "#F3F8FE" : "transparent" }}
                  >
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: s.bg }}
                    >
                      <Icon size={20} style={{ color: s.fg }} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span
                          className="text-sm leading-5 flex-1"
                          style={{ color: C.ink, fontWeight: unread ? 700 : 600 }}
                        >
                          {n.title}
                        </span>
                        {unread && (
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ background: C.rose }}
                            aria-label="ยังไม่ได้อ่าน"
                          />
                        )}
                      </span>
                      <span className="block text-sm leading-5 mt-1" style={{ color: C.sub }}>
                        {n.description}
                      </span>
                      <span className="block text-xs mt-1.5" style={{ color: C.sub }}>
                        {n.type === "news" ? "ข่าวสาร · " : ""}
                        {timeAgo(n.date)}
                      </span>
                    </span>

                    {n.type === "claim" && (
                      <ChevronRight
                        size={18}
                        className="shrink-0 self-center"
                        style={{ color: C.sub }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
