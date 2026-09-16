import React from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";

export default function Assignments({
  courses = [],
  goCreateFor,
}) {
  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2
          className="text-xl font-extrabold mb-1"
          style={{ color: C.ink }}
        >
          งานสอนของฉัน
        </h2>

        <p className="text-sm" style={{ color: C.sub }}>
          ภาคการศึกษา 1/2569 · ชั่วโมงสอนสูงสุด 45 ชั่วโมง / รายวิชา / ภาคการศึกษา
        </p>
      </div>

      {courses.length === 0 ? (
        <SectionCard className="p-10 text-center">
          <Clock3
            size={28}
            className="mx-auto mb-3"
            style={{ color: C.sub }}
          />

          <p
            className="text-sm font-medium"
            style={{ color: C.ink }}
          >
            ยังไม่มีข้อมูลรายวิชาที่ได้รับมอบหมาย
          </p>

          <p
            className="text-xs mt-1"
            style={{ color: C.sub }}
          >
            กรุณาติดต่อเจ้าหน้าที่หากข้อมูลไม่ถูกต้อง
          </p>
        </SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {courses.map((course) => {
            const quota = Number(course.quota || 45);
            const used = Number(course.used || 0);

            const remaining = Math.max(quota - used, 0);

            const percentage =
              quota > 0
                ? Math.min(
                    100,
                    Math.round((used / quota) * 100)
                  )
                : 0;

            const rate = Number(course.rate || 0);

            return (
              <SectionCard
                key={course.code}
                className="p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p
                      className="font-extrabold text-lg"
                      style={{ color: C.ink }}
                    >
                      {course.code}
                    </p>

                    <p
                      className="text-sm mt-0.5"
                      style={{ color: C.sub }}
                    >
                      {course.name || "-"}
                    </p>
                  </div>

                  {rate > 0 && (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                      style={{
                        background: C.tealSoft,
                        color: C.tealDark,
                      }}
                    >
                      ฿{rate.toLocaleString()}/ชม.
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center justify-between text-xs mb-1.5"
                  style={{ color: C.sub }}
                >
                  <span>
                    ใช้ไปแล้ว {used} ชม.
                  </span>

                  <span>
                    คงเหลือ {remaining} ชม.
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-[#EEF2F5] overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      background:
                        percentage > 85
                          ? C.rose
                          : C.teal,
                    }}
                  />
                </div>

                <div
                  className="flex items-center justify-between text-xs mb-4"
                  style={{ color: C.sub }}
                >
                  <span>
                    ใช้แล้ว {percentage}%
                  </span>

                  <span>
                    จากทั้งหมด {quota} ชม.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goCreateFor?.(course.code)
                  }
                  className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: C.tealDark }}
                >
                  สร้างคำขอสำหรับวิชานี้
                  <ArrowRight size={15} />
                </button>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}