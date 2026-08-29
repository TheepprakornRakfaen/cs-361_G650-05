import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "../theme";

const AUTO_PLAY_MS = 5500; // เลื่อนอัตโนมัติทุก ~5.5 วินาที

/**
 * แถบสไลด์แนวนอน — ลากด้วยเมาส์/นิ้วได้ มีปุ่มลูกศรเลื่อน
 * และเลื่อนอัตโนมัติเป็นช่วง ๆ (หยุดเมื่อเอาเมาส์ไปวางหรือกำลังลาก)
 */
export default function Carousel({ children }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [paused, setPaused] = useState(false);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.8, 360);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // เลื่อนอัตโนมัติ วนกลับไปต้นแถบเมื่อถึงสุดขอบขวา
  const advance = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.8, 360);
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(advance, AUTO_PLAY_MS);
    return () => clearInterval(id);
  }, [paused, advance]);

  // ลากด้วยเมาส์ (desktop) — เหมือนเว็บ lmwn.com/about-us
  const onPointerDown = (e) => {
    const el = trackRef.current;
    if (!el) return;
    setPaused(true);
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current.active = false;
  };
  // กันไม่ให้การลากไปกระตุ้น onClick ของการ์ดด้านใน
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollPaddingLeft: 4 }}
      >
        {children}
      </div>

      <button
        onClick={() => scrollByAmount(-1)}
        disabled={atStart}
        aria-label="เลื่อนไปทางซ้าย"
        className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white items-center justify-center shadow-md transition-opacity duration-200"
        style={{ border: `1px solid ${C.border}`, color: C.tealDark, opacity: atStart ? 0.35 : 1 }}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scrollByAmount(1)}
        disabled={atEnd}
        aria-label="เลื่อนไปทางขวา"
        className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white items-center justify-center shadow-md transition-opacity duration-200"
        style={{ border: `1px solid ${C.border}`, color: C.tealDark, opacity: atEnd ? 0.35 : 1 }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
