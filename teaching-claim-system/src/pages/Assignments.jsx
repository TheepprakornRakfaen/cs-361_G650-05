import React from "react";
import { ArrowRight, Clock3, BookOpen } from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";

export default function Assignments({
  courses = [],
  goCreateFor,
  courseLoading = false,
  courseError = "",
}) {
  const normalizedCourses = courses.map((course) => ({
    ...course,
    code: course.code || course.course_code || "",
    name: course.name || course.course_name_th || course.course_name_en || "-",
    section: course.section_no || "-",
    positionLabel:
      course.role === "INSTRUCTOR"
        ? "อาจารย์ผู้สอน"
        : course.role === "TA"
          ? "ผู้ช่วยสอน (TA)"
          : course.role || "ไม่ระบุตำแหน่ง",
    used: Number(course.hour ?? 0),
    quota: Number(course.max_hour ?? 45),
    remaining: Number(
      course.remaining_hour ??
        Math.max(Number(course.max_hour ?? 45) - Number(course.hour ?? 0), 0),
    ),
  }));

  return (
    <div className="w-full">
      <PageHeader
        icon={BookOpen}
        title="งานสอนของฉัน"
        description="ภาคการศึกษา / รายวิชา / ข้อมูลการมอบหมายงาน"
      />

      {courseLoading ? (
        <SectionCard className="p-10 text-center">
          <Clock3
            size={28}
            className="mx-auto mb-3 animate-pulse"
            style={{ color: C.sub }}
          />

          <p className="text-sm font-medium" style={{ color: C.ink }}>
            กำลังโหลดข้อมูลรายวิชา...
          </p>
        </SectionCard>
      ) : courseError ? (
        <SectionCard className="p-10 text-center">
          <p className="text-sm font-medium" style={{ color: C.rose }}>
            {courseError}
          </p>
        </SectionCard>
      ) : normalizedCourses.length === 0 ? (
        <SectionCard className="p-10 text-center">
          <Clock3 size={28} className="mx-auto mb-3" style={{ color: C.sub }} />

          <p className="text-sm font-medium" style={{ color: C.ink }}>
            ยังไม่มีข้อมูลรายวิชาที่ได้รับมอบหมาย
          </p>

          <p className="text-xs mt-1" style={{ color: C.sub }}>
            กรุณาติดต่อเจ้าหน้าที่หากข้อมูลไม่ถูกต้อง
          </p>
        </SectionCard>
      ) : (
        <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-5">
          {normalizedCourses.map((course) => {
            const quota = Number(course.quota || 45);
            const used = Number(course.used || 0);
            const remaining = Math.max(
              Number(course.remaining ?? quota - used),
              0,
            );

            const percentage =
              quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

            return (
              <SectionCard
                key={`${course.section_id}-${course.role || "course"}`}
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

                    <p className="text-sm mt-0.5" style={{ color: C.sub }}>
                      {course.name}
                    </p>

                    <p className="text-xs mt-1" style={{ color: C.sub }}>
                      ตอน {course.section}
                    </p>

                    <p
                      className="text-xs font-semibold mt-1.5"
                      style={{ color: C.tealDark }}
                    >
                      {course.positionLabel}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between text-xs mb-1.5"
                  style={{ color: C.sub }}
                >
                  <span>ชั่วโมงที่มีข้อมูล {used} ชม.</span>

                  <span>คงเหลือ {remaining} ชม.</span>
                </div>

                <div className="w-full h-2 rounded-full bg-[#EEF2F5] overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      background: percentage > 85 ? C.rose : C.teal,
                    }}
                  />
                </div>

                <div
                  className="flex items-center justify-between text-xs mb-4"
                  style={{ color: C.sub }}
                >
                  <span>{percentage}% ของข้อมูลชั่วโมง</span>

                  <span>สูงสุด {quota} ชม.</span>
                </div>

                <button
                  type="button"
                  onClick={() => goCreateFor?.(course)}
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
