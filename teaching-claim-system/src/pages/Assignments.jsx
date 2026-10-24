import React from "react";
import { ArrowRight, Clock3, BookOpen } from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";

export default function Assignments({
  courses = [],
  claims = [],
  periods = [],
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

  const [selectedPeriodId, setSelectedPeriodId] = React.useState("");

  const targetCourse = normalizedCourses.find(
    (course) =>
      course.code === "CS361" &&
      course.role === "INSTRUCTOR"
  );

   const selectedPeriod = periods.find(
    (period) => String(period.id) === String(selectedPeriodId)
  );

  const filteredClaims =
    targetCourse && selectedPeriod
      ? claims.filter(
          (claim) =>
            String(claim.sectionId) ===
              String(
                targetCourse.section_id ??
                targetCourse.sectionId ??
                targetCourse.id
              ) &&
            String(claim.periodId) ===
              String(selectedPeriod.id)
        )
      : [];

  const sumHours = (statuses) =>
    filteredClaims
      .filter((claim) => statuses.includes(claim.status))
      .reduce(
        (total, claim) => total + Number(claim.hours || 0),
        0
      );

  const instructorSummary = [
    {
      label: "ชั่วโมงที่ยื่นแล้ว",
      value: sumHours([
        "Submitted", "Reviewed",
        "Approved", "Rejected", "Returned"
      ]),
    },
    {
      label: "อนุมัติคำร้องแล้ว",
      value: sumHours(["Approved"]),
    },
    {
      label: "รอตรวจ / รออนุมัติ",
      value: sumHours(["Submitted", "Reviewed"]),
    },
    {
      label: "ไม่อนุมัติ",
      value: sumHours(["Rejected"]),
    },
  ];


  return (
    <div className="w-full">
      <PageHeader
        icon={BookOpen}
        title="งานสอนของฉัน"
        description="ภาคการศึกษา / รายวิชา / ข้อมูลการมอบหมายงาน"
      />
      
      <SectionCard className="p-6 mb-6">
        <h2
          className="text-lg font-extrabold"
          style={{ color: C.ink }}
        >
          สรุปชั่วโมงเบิกค่าสอน
        </h2>

        <div className="mb-5">
          <label
            htmlFor="claim-period-select"
            className="block text-sm font-semibold mb-2"
          >
            เลือกรอบการเบิกค่าสอน
          </label>

          <select
            id="claim-period-select"
            value={selectedPeriod ? selectedPeriodId : ""}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="w-full md:w-72 border rounded-xl px-4 py-2"
          >
            <option value="">-- เลือกรอบเดือน --</option>

            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {new Intl.DateTimeFormat("th-TH", {
                  month: "long"
                }).format(new Date(2026, Number(period.month) - 1, 1))}
              </option>
            ))}
          </select>
        </div>

        {targetCourse ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {instructorSummary.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-slate-50 border p-4"
                style={{ borderColor: C.border }}
              >
                <p className="text-sm" style={{ color: C.sub }}>
                  {item.label}
                </p>
                <p
                  className="text-2xl font-extrabold mt-2"
                  style={{ color: C.ink }}
                >
                  {item.value} ชม.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: C.sub }}>
            ไม่พบการมอบหมายงานสอน CS361 สำหรับอาจารย์บัญชีนี้
          </p>
        )}

        <p className="text-xs mt-4" style={{ color: C.sub }}>
          สถานะการจ่ายเงินจริงและชั่วโมงยังไม่ยื่นเบิก
          จะเชื่อมต่อเมื่อ Backend รองรับข้อมูลดังกล่าว
        </p>
      </SectionCard>
      
      <SectionCard className="p-6 mb-6">
        <h2 className="text-lg font-extrabold mb-2" style={{ color: C.ink }}>
          รายการเบิกค่าสอนจากระบบ
        </h2>

        <p className="text-sm mb-4" style={{ color: C.sub }}>
          ข้อมูลจริงจาก AWS API Gateway และ PostgreSQL
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">รายวิชา</th>
                <th className="p-3">ภาคเรียน</th>
                <th className="p-3">ชั่วโมง</th>
                <th className="p-3">สถานะคำขอ</th>
              </tr>
            </thead>

            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id} className="border-b">
                  <td className="p-3">{claim.courseCode || "-"}</td>
                  <td className="p-3">{claim.semester || "-"}</td>
                  <td className="p-3">{Number(claim.hours || 0)} ชม.</td>
                  <td className="p-3">{claim.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {claims.length === 0 && (
            <p className="p-4 text-center" style={{ color: C.sub }}>
              ยังไม่มีคำขอในฐานข้อมูล
            </p>
          )}
        </div>
      </SectionCard>


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
