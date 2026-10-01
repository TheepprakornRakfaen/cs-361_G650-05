import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

const AUTO_PLAY_MS = 5000; // เลื่อนสไลด์อัตโนมัติทุก 5 วินาที

// ลูกศรสไตล์พิกเซล (วาดจากสี่เหลี่ยมเล็ก ๆ 3x3 ช่อง)
function PixelArrow({ dir = "left" }) {
  const cells =
    dir === "left"
      ? [[1, 0], [0, 1], [1, 2]]
      : [[1, 0], [2, 1], [1, 2]];
  return (
    <svg width="22" height="22" viewBox="0 0 3 3" shapeRendering="crispEdges" aria-hidden="true">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

/**
 * สไลด์รูปภาพเต็มความกว้าง (hero) — เปลี่ยนรูปอัตโนมัติทุก 5 วิ
 * ลากด้วยนิ้ว/เมาส์ได้ และมีปุ่มลูกศร + จุดกดเลือกสไลด์
 *
 * ใส่รูปของตัวเองได้โดยแก้ path ใน array `images` ที่ส่งเข้ามา เช่น
 * <HeroCarousel images={["/images/hero-1.jpg", "/images/hero-2.jpg"]} />
 */
export default function HeroCarousel({ images = [], alt = "" }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, delta: 0 });

  const count = images.length;

  const goTo = useCallback(
    (i) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // เลื่อนอัตโนมัติ — หยุดชั่วคราวตอน hover หรือกำลังลาก
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_PLAY_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  // ลากด้วยเมาส์/นิ้วเพื่อเปลี่ยนสไลด์เอง
  const onPointerDown = (e) => {
    setPaused(true);
    drag.current = { active: true, startX: e.clientX, delta: 0 };
    trackRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    drag.current.delta = e.clientX - drag.current.startX;
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    const { delta } = drag.current;
    drag.current.active = false;
    if (delta > 50) prev();
    else if (delta < -50) next();
    setPaused(false);
  };

  if (count === 0) {
    return (
      <div
        className="relative w-full h-48 md:h-72 overflow-hidden rounded-[28px] flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #69C4CE, #3FA7B3)" }}
      >
        <div className="text-center text-white">
          <div
            className="mx-auto mb-3 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            <FileText size={30} />
          </div>
          <p className="text-sm font-semibold">ใส่รูปภาพเว็บไซต์ตรงนี้</p>
          <p className="text-xs mt-1 opacity-80">public/images/hero-1.jpg</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-48 md:h-72 overflow-hidden rounded-[28px] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="w-full h-full flex transition-transform duration-500 ease-out cursor-grab active:cursor-grabbing"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={alt || `hero-${i + 1}`}
            draggable={false}
            className="w-full h-full object-cover shrink-0"
          />
        ))}
      </div>

      {/* ปุ่มลูกศรซ้าย/ขวา (สไตล์พิกเซล) — แสดงทุกขนาดหน้าจอ */}
      <button
        type="button"
        onClick={prev}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="สไลด์ก่อนหน้า"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
        style={{ color: "#111" }}
      >
        <PixelArrow dir="left" />
      </button>
      <button
        type="button"
        onClick={next}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="สไลด์ถัดไป"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
        style={{ color: "#111" }}
      >
        <PixelArrow dir="right" />
      </button>

      {/* จุดกดเลือกสไลด์ */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`ไปสไลด์ที่ ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                background: i === index ? "#FFFFFF" : "rgba(255,255,255,0.55)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}