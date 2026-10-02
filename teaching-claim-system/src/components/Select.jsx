import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { C } from "../theme";

/**
 * Dropdown กรอบขาวตาม prototype ใช้แทน <select> ของเบราว์เซอร์
 *
 * ใช้เหมือน <select> เดิมทุกอย่าง (รับ <option> เป็น children)
 *   - value / disabled / className / style / aria-label
 *   - onChange รับ event หน้าตา { target: { value } }
 *     จึงใช้กับโค้ดเดิมที่เขียน e.target.value ได้เลย ไม่ต้องแก้ logic
 * <option value=""> = ข้อความ placeholder (แสดงเมื่อยังไม่เลือก ไม่แสดงในรายการ)
 * <option disabled> = ไม่แสดงในรายการ
 *
 * ตัวรายการ render ผ่าน portal เพื่อไม่ให้ถูก overflow-hidden ของ card ตัด
 */
function parseOptions(children) {
  const list = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== "option") return;
    list.push({
      value: child.props.value ?? "",
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    });
  });
  return list;
}

export default function Select({
  value,
  onChange,
  children,
  disabled = false,
  className = "",
  style,
  wrapperClassName = "",
  panelMinWidth,
  "aria-label": ariaLabel,
}) {
  const options = parseOptions(children);
  const placeholderOpt = options.find((o) => String(o.value) === "");
  const items = options.filter((o) => String(o.value) !== "" && !o.disabled);

  const current = options.find(
    (o) => String(o.value) === String(value ?? "") && String(o.value) !== "",
  );

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const panelH = Math.min(
      panelRef.current?.scrollHeight || 260,
      260,
    );
    const openUp = spaceBelow < panelH + 16 && r.top > spaceBelow;
    setPos({
      left: r.left,
      width: r.width,
      top: openUp ? undefined : r.bottom + 6,
      bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // เลื่อน/ย่อขยายหน้าต่างระหว่างเปิดอยู่ → คำนวณตำแหน่งใหม่
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // คลิกนอกรายการแล้วปิด
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // เลื่อนให้เห็นตัวที่ active
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    panelRef.current?.children[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [open, activeIndex, pos]);

  // ถ้าถูก disable ระหว่างเปิดอยู่ ให้ปิด
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const openList = () => {
    if (disabled) return;
    setActiveIndex(
      items.findIndex((o) => String(o.value) === String(value ?? "")),
    );
    setOpen(true);
  };

  const choose = (opt) => {
    setOpen(false);
    triggerRef.current?.focus();
    onChange && onChange({ target: { value: String(opt.value) } });
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (items[activeIndex]) choose(items[activeIndex]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const showPlaceholder = !current;
  const labelNode = current ? current.label : placeholderOpt?.label;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex items-center justify-between gap-3 text-left transition-all ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${className}`}
        style={{
          ...style,
          ...(open
            ? {
                borderColor: C.teal,
                boxShadow: "0 0 0 2px rgba(62,127,193,0.35)",
              }
            : null),
        }}
      >
        <span
          className="min-w-0 flex-1 truncate"
          style={showPlaceholder && placeholderOpt ? { color: C.sub } : undefined}
        >
          {labelNode ?? "\u00A0"}
        </span>
        <ChevronDown
          size={17}
          strokeWidth={2.4}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: C.ink,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="fixed z-[100] max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5"
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              minWidth: panelMinWidth ?? pos.width,
              maxWidth: "calc(100vw - 16px)",
              border: `1px solid ${C.border}`,
              boxShadow: "0 18px 40px -10px rgba(15,40,70,0.28)",
              animation: "fadein .15s ease-out",
            }}
          >
            {items.length === 0 && (
              <div className="px-4 py-3 text-sm" style={{ color: C.sub }}>
                ไม่มีตัวเลือก
              </div>
            )}
            {items.map((opt, i) => {
              const selected = String(opt.value) === String(value ?? "");
              const active = i === activeIndex;
              return (
                <button
                  key={`${opt.value}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(opt)}
                  className="w-full flex items-center justify-between gap-3 text-left rounded-xl px-4 py-3 text-sm transition-colors"
                  style={{
                    background: active || selected ? C.tealSoft : "transparent",
                    color: C.ink,
                    fontWeight: selected ? 700 : 500,
                  }}
                >
                  <span className="min-w-0 flex-1">{opt.label}</span>
                  {selected && (
                    <Check
                      size={16}
                      className="shrink-0"
                      style={{ color: C.tealDark }}
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
