import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "../theme";

/*
 * แถบเปลี่ยนหน้าใต้ตาราง
 * "แสดง 11–20 จาก 55 รายการ"   ‹ 1 2 [3] 4 … 6 ›
 */

// เลขหน้าที่จะแสดง: หน้าแรก หน้าสุดท้าย และรอบๆ หน้าปัจจุบัน ที่เหลือเป็น "…"
function pageList(page, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) {
      result.push("…" + p);
    }
    result.push(p);
  });

  return result;
}

export default function Pagination({
  page,
  pageSize,
  total,
  onChange,
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (total <= pageSize) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const arrowClass =
    "w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#EEF4F8] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent";

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t"
      style={{ borderColor: C.border }}
    >
      <p className="text-xs" style={{ color: C.sub }}>
        แสดง {from}–{to} จาก {total} รายการ
      </p>

      <nav className="flex items-center gap-1" aria-label="เปลี่ยนหน้า">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={arrowClass}
          style={{ color: C.tealDark }}
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft size={16} />
        </button>

        {pageList(page, pageCount).map((p) =>
          typeof p === "string" ? (
            <span
              key={p}
              className="w-8 text-center text-xs"
              style={{ color: C.sub }}
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[2rem] h-8 px-2 rounded-full text-xs font-semibold transition-colors ${
                p === page ? "" : "hover:bg-[#EEF4F8]"
              }`}
              style={
                p === page
                  ? { background: C.tealDark, color: "#fff" }
                  : { color: C.ink }
              }
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className={arrowClass}
          style={{ color: C.tealDark }}
          aria-label="หน้าถัดไป"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
