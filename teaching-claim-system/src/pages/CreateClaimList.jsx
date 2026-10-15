import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Clock,
  FilePlus2,
  RefreshCw,
  Loader2,
  CalendarDays,
  X,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";

/*
 * ค้นหาปี:
 *  - พิมพ์ "2569"   → แสดงเฉพาะรอบของปีการศึกษา 2569 (ตรงตัว ไม่ใช่ substring)
 *  - พิมพ์ "1/2569" → แสดงเฉพาะภาค 1 ของปี 2569
 *  - พิมพ์ข้อความอื่น → ค้นจากชื่อรอบ / เดือน / วิชา
 * แยกปีด้วยตัวกรอง + หัวข้อกลุ่ม "ปีการศึกษา → ภาคการศึกษา" ไม่ให้รอบต่างปีปนกัน
 */
const YEAR_ONLY = /^\d{4}$/;
const TERM_QUERY = /^(\d)\s*\/\s*(\d{4})$/;

function parseQuery(raw) {
  const text = raw.trim();

  if (YEAR_ONLY.test(text)) {
    return { year: text, semester: "", text: "" };
  }

  const termMatch = text.match(TERM_QUERY);

  if (termMatch) {
    return { year: termMatch[2], semester: termMatch[1], text: "" };
  }

  return { year: "", semester: "", text: text.toLowerCase() };
}

const byYearDesc = (a, b) => Number(b) - Number(a);
const bySemesterDesc = (a, b) => Number(b) - Number(a);

export default function CreateClaimList({
  rounds = [],
  courses = [],
  loading = false,
  error = "",
  onReload,
  goCreateForRound,
}) {
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const getCourse = (courseCode) =>
    courses.find((course) => course.code === courseCode);

  // ตัวเลือกปี/ภาค มาจากข้อมูลจริง
  const years = useMemo(
    () =>
      [...new Set(rounds.map((r) => r.year).filter(Boolean))].sort(
        byYearDesc
      ),
    [rounds]
  );

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          rounds
            .filter((r) => yearFilter === "All" || r.year === yearFilter)
            .map((r) => r.semester)
            .filter(Boolean)
        ),
      ].sort(),
    [rounds, yearFilter]
  );

  const filtered = useMemo(() => {
    const q = parseQuery(query);

    return rounds.filter((round) => {
      if (yearFilter !== "All" && round.year !== yearFilter) return false;
      if (semesterFilter !== "All" && round.semester !== semesterFilter)
        return false;
      if (statusFilter !== "All" && round.status !== statusFilter)
        return false;

      // ค้นด้วยปี / ภาค/ปี → เทียบตรงตัวกับข้อมูลภาคการศึกษา
      if (q.year && round.year !== q.year) return false;
      if (q.semester && round.semester !== q.semester) return false;

      if (q.text) {
        const course = getCourse(round.courseCode);
        const haystack = [
          round.label,
          round.month,
          round.termLabel,
          round.courseCode,
          course?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q.text)) return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, courses, query, yearFilter, semesterFilter, statusFilter]);

  // จัดกลุ่ม: ปี → ภาค → รอบ
  const groups = useMemo(() => {
    const byYear = new Map();

    filtered.forEach((round) => {
      const year = round.year || "-";
      const semester = round.semester || "-";

      if (!byYear.has(year)) byYear.set(year, new Map());
      const bySem = byYear.get(year);
      if (!bySem.has(semester)) bySem.set(semester, []);
      bySem.get(semester).push(round);
    });

    return [...byYear.keys()].sort(byYearDesc).map((year) => ({
      year,
      semesters: [...byYear.get(year).keys()]
        .sort(bySemesterDesc)
        .map((semester) => ({
          semester,
          rounds: byYear
            .get(year)
            .get(semester)
            .sort(
              (a, b) =>
                new Date(a.openAt || 0).getTime() -
                new Date(b.openAt || 0).getTime()
            ),
        })),
    }));
  }, [filtered]);

  const hasFilter =
    query.trim() !== "" ||
    yearFilter !== "All" ||
    semesterFilter !== "All" ||
    statusFilter !== "All";

  const clearFilters = () => {
    setQuery("");
    setYearFilter("All");
    setSemesterFilter("All");
    setStatusFilter("All");
  };

  const selectClass =
    "rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none min-w-[9.5rem]";

  return (
    <div className="w-full max-w-none">
      <PageHeader
        icon={FilePlus2}
        title="สร้างคำขอ"
        description="เลือกรอบการยื่นที่เปิดรับ แล้วกด “สร้างคำขอ” เพื่อเริ่มกรอกข้อมูล"
        action={
          onReload && (
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: C.border, color: C.tealDark }}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              รีเฟรช
            </button>
          )
        }
      />

      {/* Search + filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <div
          className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1"
          style={{ borderColor: C.border }}
        >
          <Search size={16} style={{ color: C.sub }} />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาปี เช่น 2569 หรือ ภาค/ปี เช่น 1/2569 หรือชื่อรอบ"
            className="outline-none text-sm w-full bg-transparent"
            style={{ color: C.ink }}
            aria-label="ค้นหารอบการยื่น"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ล้างคำค้นหา"
              style={{ color: C.sub }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setSemesterFilter("All");
            }}
            className={selectClass}
            style={{ borderColor: C.border, color: C.ink }}
            aria-label="ปีการศึกษา"
          >
            <option value="All">ทุกปีการศึกษา</option>
            {years.map((year) => (
              <option key={year} value={year}>
                ปี {year}
              </option>
            ))}
          </Select>

          <Select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className={selectClass}
            style={{ borderColor: C.border, color: C.ink }}
            aria-label="ภาคการศึกษา"
          >
            <option value="All">ทุกภาค</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>
                ภาค {semester}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
            style={{ borderColor: C.border, color: C.ink }}
            aria-label="สถานะรอบ"
          >
            <option value="All">สถานะทั้งหมด</option>
            <option value="Open">เปิดรับ</option>
            <option value="Closed">ปิดรับ</option>
          </Select>
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-2xl mb-4 text-sm"
          style={{ background: C.roseSoft, color: "#C23B3B" }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* รายการ แยกตามปี → ภาค */}
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <section key={group.year} aria-label={`ปีการศึกษา ${group.year}`}>
            <h2
              className="flex items-center gap-2 text-lg font-extrabold mb-4 pb-2 border-b"
              style={{ color: C.ink, borderColor: C.border }}
            >
              <CalendarDays size={18} style={{ color: C.tealDark }} />
              ปีการศึกษา {group.year}
            </h2>

            <div className="flex flex-col gap-6">
              {group.semesters.map(({ semester, rounds: list }) => (
                <div key={semester}>
                  <p
                    className="text-sm font-bold mb-3 flex items-center gap-2"
                    style={{ color: C.tealDark }}
                  >
                    ภาคการศึกษา {semester}/{group.year}
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: C.tealSoft }}
                    >
                      {list.length} รอบ
                    </span>
                  </p>

                  <div className="flex flex-col gap-4">
                    {list.map((round) => {
                      const course = getCourse(round.courseCode);
                      const open = round.status === "Open";
                      const quota = Number(course?.quota || 45);
                      const used = Number(course?.used || 0);
                      const remaining = Math.max(quota - used, 0);

                      return (
                        <SectionCard key={round.id} className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p
                                className="font-extrabold text-[15px]"
                                style={{ color: C.ink }}
                              >
                                {round.label}
                              </p>

                              {round.termLabel && (
                                <p
                                  className="text-xs mt-1 font-semibold"
                                  style={{ color: C.tealDark }}
                                >
                                  ภาคการศึกษา {round.termLabel}
                                </p>
                              )}

                              {round.period && (
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: C.sub }}
                                >
                                  {round.period}
                                </p>
                              )}

                              {round.deadline && (
                                <p
                                  className="text-xs mt-0.5 truncate"
                                  style={{ color: C.sub }}
                                >
                                  ส่งหลักฐานภายใน {round.deadline}
                                </p>
                              )}

                              {course && (
                                <p
                                  className="text-xs mt-1 font-semibold"
                                  style={{ color: C.tealDark }}
                                >
                                  {course.code} — {course.name}
                                </p>
                              )}
                            </div>

                            <span
                              className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                              style={
                                open
                                  ? { background: "#DFF5E6", color: "#1E8E4F" }
                                  : { background: "#EDF0F2", color: "#5B6672" }
                              }
                            >
                              {open ? "เปิดรับ" : "ปิดรับ"}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span
                              className="flex items-center gap-1.5 text-xs"
                              style={{ color: C.sub }}
                            >
                              <Clock size={13} />
                              เหลือ {remaining} จาก {quota} ชม.
                            </span>

                            <button
                              type="button"
                              disabled={!open}
                              onClick={() => open && goCreateForRound?.(round)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                              style={{
                                background: open
                                  ? `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`
                                  : C.sub,
                              }}
                            >
                              สร้างคำขอ
                              <Plus size={14} />
                            </button>
                          </div>
                        </SectionCard>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <SectionCard className="p-10 text-center">
            <p className="text-sm" style={{ color: C.sub }}>
              {loading ? "กำลังโหลดรอบการยื่น..." : "ไม่พบรอบที่ตรงกับเงื่อนไข"}
            </p>

            {!loading && hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold underline underline-offset-2"
                style={{ color: C.tealDark }}
              >
                ล้างตัวกรอง
              </button>
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
}
