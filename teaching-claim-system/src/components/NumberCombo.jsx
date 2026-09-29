import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { C } from "../theme";

/**
 * ช่องตัวเลขที่พิมพ์เองได้ + มีรายการตัวเลือกให้กด
 * ต่างจาก <datalist> ของเบราว์เซอร์ตรงที่แสดงตัวเลือกครบทุกครั้ง ไม่กรองตามที่พิมพ์
 *
 * value / onChange ใช้ string (เช่น "47") เหมือน input ปกติ
 * พิมพ์ได้เฉพาะตัวเลข และไม่เกิน max (เช่น นาทีห้ามเกิน 59)
 */
export default function NumberCombo({
  value,
  onChange,
  options = [],
  max = 99,
  ariaLabel,
  placeholder = "0",
  width = "5rem",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // ปิดรายการเมื่อคลิกนอกช่อง
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // เลื่อนรายการให้เห็นตัวที่เลือกอยู่
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openList = () => {
    setActiveIndex(options.findIndex((option) => String(option) === String(value)));
    setOpen(true);
  };

  const choose = (option) => {
    onChange(String(option));
    setOpen(false);
  };

  const handleType = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);

    if (digits === "") {
      onChange("");
      return;
    }

    // เกินค่าสูงสุด = ไม่รับตัวที่พิมพ์ล่าสุด
    if (Number(digits) <= max) {
      onChange(String(Number(digits)));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();

      if (!open) {
        openList();
        return;
      }

      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) =>
        Math.min(options.length - 1, Math.max(0, current + step))
      );
    } else if (e.key === "Enter" && open && activeIndex >= 0) {
      e.preventDefault();
      choose(options[activeIndex]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative shrink-0" style={{ width }}>
      <input
        type="text"
        inputMode="numeric"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="fld text-center"
        style={{ paddingRight: "1.75rem" }}
        placeholder={placeholder}
        value={value}
        onChange={handleType}
        onFocus={openList}
        onClick={openList}
        onKeyDown={handleKeyDown}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label={`เลือก${ariaLabel || ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#E8F0FA]"
      >
        <ChevronDown
          size={14}
          style={{
            color: C.sub,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border bg-white py-1 z-30"
          style={{
            borderColor: C.border,
            boxShadow: "0 12px 30px -10px rgba(15,40,70,0.30)",
          }}
        >
          {options.map((option, index) => {
            const selected = String(option) === String(value);
            const active = index === activeIndex;

            return (
              <li
                key={option}
                role="option"
                aria-selected={selected}
                // ใช้ mousedown เพื่อเลือกก่อนช่องเสีย focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className="px-3 py-1.5 text-sm text-center cursor-pointer"
                style={{
                  background: active ? C.tealSoft : "transparent",
                  color: selected ? C.tealDark : C.ink,
                  fontWeight: selected ? 700 : 500,
                }}
              >
                {option}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
