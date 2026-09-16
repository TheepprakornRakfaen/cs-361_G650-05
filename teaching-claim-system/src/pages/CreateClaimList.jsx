import React, { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Clock,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";

export default function CreateClaimList({
  rounds = [],
  courses = [],
  goCreateForRound,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const getCourse = (courseCode) => {
    return courses.find(
      (course) => course.code === courseCode
    );
  };

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return rounds.filter((round) => {
      const course = getCourse(round.courseCode);

      const haystack = [
        round.id,
        round.label,
        round.period,
        round.deadline,
        round.courseCode,
        course?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        keyword === "" ||
        haystack.includes(keyword);

      const matchesStatus =
        statusFilter === "All" ||
        round.status === statusFilter;

      return (
        matchesQuery &&
        matchesStatus
      );
    });
  }, [rounds, courses, query, statusFilter]);

  return (
    <div className="max-w-3xl">
      {/* Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div
          className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1"
          style={{ borderColor: C.border }}
        >
          <Search
            size={16}
            style={{ color: C.sub }}
          />

          <input
            type="text"
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="ค้นหา รหัสคำขอ / รายวิชา"
            className="outline-none text-sm w-full bg-transparent"
            style={{ color: C.ink }}
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="appearance-none rounded-full border pl-4 pr-9 py-2.5 text-sm font-medium bg-white outline-none"
            style={{
              borderColor: C.border,
              color: C.ink,
            }}
          >
            <option value="All">
              สถานะทั้งหมด
            </option>

            <option value="Open">
              เปิดรับ
            </option>

            <option value="Closed">
              ปิดรับ
            </option>
          </select>

          <ChevronDown
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: C.sub }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {filtered.map((round) => {
          const course = getCourse(
            round.courseCode
          );

          const open =
            round.status === "Open";

          const quota = Number(
            course?.quota || 45
          );

          const used = Number(
            course?.used || 0
          );

          const remaining = Math.max(
            quota - used,
            0
          );

          return (
            <SectionCard
              key={round.id}
              className="p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className="font-extrabold text-[15px]"
                    style={{ color: C.ink }}
                  >
                    {round.label}
                  </p>

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
                      ส่งหลักฐานภายใน{" "}
                      {round.deadline}
                    </p>
                  )}

                  {course && (
                    <p
                      className="text-xs mt-1 font-semibold"
                      style={{ color: C.tealDark }}
                    >
                      {course.code} —{" "}
                      {course.name}
                    </p>
                  )}
                </div>

                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
                  style={
                    open
                      ? {
                          background: "#DFF5E6",
                          color: "#1E8E4F",
                        }
                      : {
                          background: "#EDF0F2",
                          color: "#5B6672",
                        }
                  }
                >
                  {open
                    ? "เปิดรับ"
                    : "ปิดรับ"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: C.sub }}
                >
                  <Clock size={13} />

                  เหลือ {remaining} จาก{" "}
                  {quota} ชม.
                </span>

                <button
                  type="button"
                  disabled={!open}
                  onClick={() =>
                    open &&
                    goCreateForRound?.(
                      round
                    )
                  }
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

        {filtered.length === 0 && (
          <SectionCard className="p-10 text-center">
            <p
              className="text-sm"
              style={{ color: C.sub }}
            >
              ไม่พบรอบที่ตรงกับเงื่อนไข
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}