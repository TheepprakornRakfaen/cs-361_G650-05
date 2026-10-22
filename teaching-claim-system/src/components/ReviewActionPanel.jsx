import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardCheck,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { C } from "../theme";
import {
  formatThaiDate,
  formatDuration,
  sessionMinutes,
} from "../utils/time";

const TONE = {
  teal: { bg: C.teal, icon: ClipboardCheck },
  green: { bg: "#1E8E4F", icon: CheckCircle2 },
  red: { bg: "#C23B3B", icon: XCircle },
  amber: { bg: "#D9772B", icon: RotateCcw },
};

function ConfirmDialog({
  action,
  busy,
  error,
  warning,
  sessions = [],
  onCancel,
  onConfirm,
}) {
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef(null);

  /*
   * อนุมัติแยกวัน: คำขอหลายวัน ผู้อนุมัติเลือกได้ว่าอนุมัติวันไหน
   * (ต้องมี claim_date.id จาก backend ถึงจะเลือกรายวันได้)
   */
  const daySessions =
    action.key === "APPROVE"
      ? sessions.filter((session) => session.dateId != null)
      : [];
  const perDay = daySessions.length > 1;

  const [selected, setSelected] = useState(
    () => new Set(daySessions.map((session) => String(session.dateId)))
  );

  const toggleDay = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const partial = perDay && selected.size < daySessions.length;
  const noneSelected = perDay && selected.size === 0;

  const tone = TONE[action.tone] || TONE.teal;
  // อนุมัติไม่ครบทุกวัน → ต้องระบุเหตุผลของวันที่ไม่อนุมัติ
  const missing =
    (action.requireComment || partial) && comment.trim().length === 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const submit = () => {
    setTouched(true);
    if (missing || busy || noneSelected) return;

    const extra = partial
      ? {
          approved_date_ids: daySessions
            .filter((s) => selected.has(String(s.dateId)))
            .map((s) => s.dateId),
          rejected_date_ids: daySessions
            .filter((s) => !selected.has(String(s.dateId)))
            .map((s) => s.dateId),
        }
      : {};

    onConfirm(comment.trim(), extra);
  };

  const Icon = tone.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 30, 45, 0.6)" }}
      onClick={() => !busy && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-label={action.confirmTitle}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: tone.bg }}
          >
            <Icon size={19} color="#fff" />
          </span>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold" style={{ color: C.ink }}>
              {action.confirmTitle}
            </h3>

            <p className="text-sm mt-1 leading-6" style={{ color: C.sub }}>
              {action.confirmText}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#EEF4F8] disabled:opacity-40"
            style={{ color: C.sub }}
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        {perDay && (
          <div className="mt-5">
            <p className="text-sm font-semibold mb-1.5" style={{ color: C.ink }}>
              เลือกวันที่อนุมัติ ({selected.size}/{daySessions.length} วัน)
            </p>

            <div
              className="rounded-xl border divide-y max-h-48 overflow-y-auto"
              style={{ borderColor: C.border }}
            >
              {daySessions.map((session) => {
                const id = String(session.dateId);
                const checked = selected.has(id);

                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-[#F4F8FB]"
                    style={{ borderColor: C.border }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggleDay(id)}
                      className="w-4 h-4 accent-[#1E8E4F]"
                    />
                    <span
                      className="flex-1 font-semibold"
                      style={{ color: checked ? C.ink : C.sub }}
                    >
                      {formatThaiDate(session.date)}
                    </span>
                    <span style={{ color: C.sub }}>
                      {formatDuration(sessionMinutes(session))}
                    </span>
                  </label>
                );
              })}
            </div>

            {noneSelected && (
              <p className="text-xs mt-1" style={{ color: C.rose }}>
                ต้องเลือกอย่างน้อย 1 วัน ถ้าไม่อนุมัติทุกวันให้ใช้ “ไม่อนุมัติ” หรือ “ส่งกลับแก้ไข”
              </p>
            )}
          </div>
        )}

        <label
          htmlFor="review-comment"
          className="block text-sm font-semibold mt-5 mb-1.5"
          style={{ color: C.ink }}
        >
          {partial ? "เหตุผลของวันที่ไม่อนุมัติ" : action.commentLabel}
          {(action.requireComment || partial) && (
            <span style={{ color: C.rose }}> *</span>
          )}
        </label>

        <textarea
          id="review-comment"
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={4}
          maxLength={1000}
          disabled={busy}
          aria-invalid={touched && missing}
          className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none resize-none"
          style={{
            borderColor: touched && missing ? C.rose : C.border,
            color: C.ink,
          }}
        />

        <div className="flex justify-between mt-1 min-h-[1.25rem]">
          <p className="text-xs" style={{ color: C.rose }}>
            {touched && missing ? "กรุณาระบุเหตุผล" : ""}
          </p>

          <p className="text-xs" style={{ color: C.sub }}>
            {comment.length}/1000
          </p>
        </div>

        {warning && (
          <p
            className="flex items-start gap-2 text-sm mt-2 px-3 py-2 rounded-xl"
            style={{ background: "#FDEBDD", color: "#B4531A" }}
          >
            <Info size={15} className="mt-0.5 shrink-0" />
            {warning}
          </p>
        )}

        {error && (
          <p
            className="text-sm mt-2 px-3 py-2 rounded-xl"
            style={{ background: C.roseSoft, color: "#C23B3B" }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: C.border, color: C.ink }}
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={busy || noneSelected}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: tone.bg }}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {partial
              ? `อนุมัติ ${selected.size} วัน`
              : action.confirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * [V3] ปุ่มดำเนินการของเจ้าหน้าที่ / ผู้อนุมัติ
 *  - actions มาจาก getAllowedActions → ไม่มีสิทธิ์ = ไม่ render อะไรเลย
 *  - ทุกการกดต้องยืนยันผ่านกล่องโต้ตอบ (กันกดพลาด) และบังคับเหตุผลเมื่อส่งกลับ/ไม่อนุมัติ
 *  - ส่งซ้ำไม่ได้ระหว่างรอ (busy)
 */
export default function ReviewActionPanel({
  actions = [],
  blockedReason = "",
  onAction,
  // { canView, loading, total, viewed } — สรุปหลักฐานแนบ แสดงให้ผู้ตรวจสอบเห็นก่อนตัดสินใจ
  evidence = null,
  // ผ่านการตรวจสอบ (ส่งต่อผู้อนุมัติ) แล้วหรือยัง — ใช้เตือนผู้อนุมัติ/แสดงข้อความ
  reviewed = false,
  reviewedBy = "",
  // วันสอนของคำขอ — ใช้เลือกอนุมัติแยกวัน
  sessions = [],
}) {
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (actions.length === 0 && !blockedReason) return null;

  const close = () => {
    setActive(null);
    setError("");
  };

  const confirm = async (comment, extra) => {
    setBusy(true);
    setError("");

    try {
      await onAction(active.key, comment, extra);
      setActive(null);
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "ไม่สามารถดำเนินการได้ กรุณาลองใหม่"
      );
    } finally {
      setBusy(false);
    }
  };

  // เตือน (ไม่บังคับ) ตอนกดอนุมัติ ถ้ายังไม่ได้เปิดดูหลักฐานครบ
  const evidenceWarning =
    evidence?.canView && !evidence.loading
      ? evidence.total === 0
        ? "คำขอนี้ไม่มีไฟล์แนบหลักฐาน"
        : evidence.viewed < evidence.total
          ? `ยังไม่ได้เปิดดูหลักฐาน ${evidence.total - evidence.viewed} จาก ${evidence.total} ไฟล์`
          : ""
      : "";

  const approveWarning =
    active?.key === "APPROVE" || active?.key === "REVIEW_PASS"
      ? evidenceWarning
      : "";

  return (
    <div
      className="rounded-2xl p-5 md:p-6 mb-8 border"
      style={{ borderColor: C.border, background: "#FAFCFD" }}
    >
      <p className="text-sm font-semibold mb-3" style={{ color: C.ink }}>
        การพิจารณาคำขอ
      </p>

      {evidence?.canView && actions.length > 0 && (
        <div
          className="flex items-center justify-between gap-3 flex-wrap rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: C.tealSoft, color: C.tealDark }}
        >
          <span>
            {evidence.loading
              ? "กำลังโหลดหลักฐานแนบ..."
              : evidence.total === 0
                ? "ไม่มีไฟล์แนบ"
                : `หลักฐานแนบ ${evidence.total} ไฟล์ · เปิดดูแล้ว ${evidence.viewed}`}
          </span>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("evidence-section")
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            className="font-semibold underline underline-offset-2"
          >
            ไปที่หลักฐานแนบ
          </button>
        </div>
      )}

      {reviewed && actions.length > 0 && (
        <p
          className="flex items-center gap-2 text-sm mb-3"
          style={{ color: "#1E8E4F" }}
        >
          <CheckCircle2 size={15} />
          ตรวจสอบแล้ว{reviewedBy ? `โดย ${reviewedBy}` : ""} · รอผู้อนุมัติพิจารณา
        </p>
      )}

      {blockedReason ? (
        <p className="flex items-center gap-2 text-sm" style={{ color: C.sub }}>
          <Info size={15} />
          {blockedReason}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const tone = TONE[action.tone] || TONE.teal;
            const Icon = tone.icon;
            const outlined =
              action.key === "RETURN" || action.key === "REJECT";

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => setActive(action)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={
                  outlined
                    ? { border: `1.5px solid ${tone.bg}`, color: tone.bg }
                    : { background: tone.bg, color: "#fff" }
                }
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <ConfirmDialog
          action={active}
          busy={busy}
          error={error}
          warning={approveWarning}
          sessions={sessions}
          onCancel={close}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
