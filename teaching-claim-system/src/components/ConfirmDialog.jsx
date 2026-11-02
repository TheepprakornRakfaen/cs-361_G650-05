import React, { useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import { C } from "../theme";

/*
 * กล่องยืนยันการทำรายการ (ใช้ซ้ำได้ทั้งแอป)
 *  - open        แสดง/ซ่อน
 *  - title       หัวข้อ
 *  - message     ข้อความอธิบาย
 *  - confirmText / cancelText  ข้อความบนปุ่ม
 *  - tone        "danger" (แดง) | "primary" (เขียว-น้ำเงิน)
 *  - loading     กำลังทำรายการ (ปิดปุ่มกันกดซ้ำ)
 *  - onConfirm / onClose  callback
 *
 * เข้าถึงได้ด้วยคีย์บอร์ด: Esc = ยกเลิก, โฟกัสเริ่มที่ปุ่มยืนยัน
 */
export default function ConfirmDialog({
  open,
  title = "ยืนยันการทำรายการ",
  message = "",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  tone = "danger",
  loading = false,
  icon: Icon = AlertTriangle,
  onConfirm,
  onClose,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    confirmRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const danger = tone === "danger";
  const accent = danger ? C.rose : C.tealDark;
  const accentSoft = danger ? C.roseSoft : C.tealSoft;
  const confirmBg = danger
    ? C.rose
    : `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(30,41,59,0.45)" }}
      onClick={() => !loading && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm p-7 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !loading && onClose?.()}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F2F6F8] disabled:opacity-40"
          style={{ color: C.sub }}
          aria-label="ปิด"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: accentSoft }}
          >
            <Icon size={26} style={{ color: accent }} />
          </div>

          <h2
            id="confirm-title"
            className="font-extrabold text-lg"
            style={{ color: C.ink }}
          >
            {title}
          </h2>

          {message && (
            <p className="text-sm mt-1.5" style={{ color: C.sub }}>
              {message}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 mt-6">
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full border text-sm font-semibold transition-colors hover:bg-[#F1F4F7] disabled:opacity-60"
            style={{ borderColor: C.border, color: C.sub }}
          >
            {cancelText}
          </button>

          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: confirmBg }}
          >
            {loading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
