import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Plus,
  ClipboardList,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatusPill from "../components/StatusPill";
import Pagination from "../components/Pagination";
import { STATUS_STYLE } from "../theme";
import { DELETABLE_STATUSES } from "../data/workflow";

export default function MyClaims({
  claims = [],
  goDetail,
  goCreate,
  onDelete,
  // โหลดรายการใหม่จาก backend (เช่น ดูว่าผู้ตรวจสอบเปลี่ยนสถานะแล้วหรือยัง)
  onReload,
  loading = false,
  // สถานะที่ให้กรองไว้ตั้งแต่เปิดหน้า เช่น "Draft" เมื่อกดมาจากการ์ดแบบร่างในโปรไฟล์
  initialStatus = "All",
  // ภาคปัจจุบัน เช่น "1/2569" ใช้เป็นค่าเริ่มต้นของตัวกรองภาค
  currentTermLabel = "",
  // ภาคทั้งหมดในระบบ (จาก /api/term) และรายวิชาที่สอนในภาคปัจจุบัน (จาก /api/courses)
  termLabels = [],
  courseCodes = [],
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState(initialStatus);

  // null = ผู้ใช้ยังไม่ได้เลือก → ใช้ภาคปัจจุบัน (ภาคโหลดจาก API ทีหลัง)
  const [termChoice, setTermChoice] =
    useState(null);
  const [courseFilter, setCourseFilter] =
    useState("All");

  // ถ้าคำขอไม่มีข้อมูลภาคเลย อย่าตั้งค่าเริ่มต้นเป็นภาคปัจจุบัน ไม่งั้นตารางจะว่าง
  const hasTermData = claims.some(
    (claim) => claim.termLabel
  );

  const termFilter =
    termChoice ??
    (hasTermData && currentTermLabel
      ? currentTermLabel
      : "All");

  // "1/2569" → เรียงปีใหม่ก่อน แล้วภาคมากก่อน
  const termSortKey = (label) => {
    const [semester, year] =
      String(label).split("/");
    return Number(year || 0) * 10 + Number(semester || 0);
  };

  const termOptions = useMemo(() => {
    const labels = new Set([
      ...termLabels,
      ...claims
        .map((claim) => claim.termLabel)
        .filter(Boolean),
    ]);

    if (currentTermLabel) {
      labels.add(currentTermLabel);
    }

    return [...labels].sort(
      (a, b) =>
        termSortKey(b) - termSortKey(a)
    );
  }, [claims, currentTermLabel, termLabels]);

  // คำขอในภาค + รายวิชาที่เลือก (ใช้ทั้งการ์ดนับและตาราง)
  const scoped = useMemo(
    () =>
      claims.filter(
        (claim) =>
          (termFilter === "All" ||
            claim.termLabel === termFilter) &&
          (courseFilter === "All" ||
            claim.courseCode === courseFilter)
      ),
    [claims, termFilter, courseFilter]
  );

  // รายวิชาที่มีคำขอในภาคที่เลือก + วิชาที่สอนในภาคปัจจุบัน
  const courseOptions = useMemo(
    () =>
      [
        ...new Set([
          ...(termFilter === "All" ||
          termFilter === currentTermLabel
            ? courseCodes
            : []),
          ...claims
            .filter(
              (claim) =>
                termFilter === "All" ||
                claim.termLabel === termFilter
            )
            .map((claim) => claim.courseCode)
            .filter(
              (code) => code && code !== "-"
            ),
        ]),
      ].sort(),
    [claims, termFilter, currentTermLabel, courseCodes]
  );

  const counts = useMemo(() => {
    const result = {
      Draft: 0,
      Submitted: 0,
      Returned: 0,
      Approved: 0,
      Paid: 0,
    };

    scoped.forEach((claim) => {
      if (result[claim.status] !== undefined) {
        result[claim.status] += 1;
      }
    });

    return result;
  }, [scoped]);

  const filtered = useMemo(() => {
    const keyword =
      query.trim().toLowerCase();

    return scoped.filter((claim) => {
      const matchesQuery =
        keyword === "" ||
        String(claim.id)
          .toLowerCase()
          .includes(keyword) ||
        String(claim.code || "")
          .toLowerCase()
          .includes(keyword) ||
        String(claim.termLabel || "")
          .toLowerCase()
          .includes(keyword) ||
        String(claim.courseCode || "")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "All" ||
        claim.status === statusFilter;

      return (
        matchesQuery &&
        matchesStatus
      );
    });
  }, [
    scoped,
    query,
    statusFilter,
  ]);

  // แบ่งหน้าละ 10 รายการ
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // เปลี่ยนตัวกรอง/คำค้นหา → กลับไปหน้าแรก
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, termFilter, courseFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  // ลบรายการจนหน้าปัจจุบันว่าง → ถอยไปหน้าสุดท้ายที่มีข้อมูล
  const currentPage = Math.min(page, pageCount);

  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const STATUS_KEYS = [
    "Draft",
    "Submitted",
    "Reviewed",
    "Returned",
    "Approved",
    "Paid",
    "Rejected",
  ];

  const statusCards = STATUS_KEYS.map((key) => [
    key,
    STATUS_STYLE[key].label,
    STATUS_STYLE[key].bg,
    STATUS_STYLE[key].fg,
  ]);

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="คำขอของฉัน"
        description="ติดตามสถานะคำขอเบิกค่าสอนทั้งหมดของคุณ กดที่แถวเพื่อดูรายละเอียด"
        action={
          <div className="flex items-center gap-2">
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm border bg-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                borderColor: C.border,
                color: C.ink,
              }}
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              รีเฟรช
            </button>
          )}

          <button
            type="button"
            onClick={goCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{
              background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
            }}
          >
            สร้างคำขอ
            <Plus size={16} />
          </button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
        <div
          className="flex items-center gap-2 bg-white rounded-full border px-4 py-2.5 flex-1 max-w-md"
          style={{
            borderColor: C.border,
          }}
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

        <Select
          value={termFilter}
          onChange={(e) => {
            setTermChoice(e.target.value);
            // รายวิชาเดิมอาจไม่มีในภาคใหม่
            setCourseFilter("All");
          }}
          className="rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none min-w-[9rem]"
          style={{
            borderColor: C.border,
            color: C.ink,
          }}
        >
          <option value="All">
            ทุกภาค
          </option>

          {termOptions.map((label) => (
            <option key={label} value={label}>
              ภาค {label}
            </option>
          ))}
        </Select>

        <Select
          value={courseFilter}
          onChange={(e) =>
            setCourseFilter(e.target.value)
          }
          className="rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none min-w-[9rem]"
          style={{
            borderColor: C.border,
            color: C.ink,
          }}
        >
          <option value="All">
            ทุกรายวิชา
          </option>

          {courseOptions.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="rounded-full border pl-4 pr-3.5 py-2.5 text-sm font-medium bg-white outline-none min-w-[10rem]"
          style={{
            borderColor: C.border,
            color: C.ink,
          }}
        >
          <option value="All">
            ทุกสถานะ
          </option>

          {STATUS_KEYS.map((key) => (
            <option key={key} value={key}>
              {STATUS_STYLE[key].label}
            </option>
          ))}
        </Select>

        {(query ||
          statusFilter !== "All" ||
          courseFilter !== "All" ||
          termChoice !== null) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("All");
              setCourseFilter("All");
              setTermChoice(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: C.sub }}
          >
            <X size={14} />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-4 mb-8">
        {statusCards.map(
          ([key, label, bg, fg]) => (
            <button
              type="button"
              key={key}
              onClick={() =>
                setStatusFilter(
                  statusFilter === key
                    ? "All"
                    : key
                )
              }
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: bg,
                outline:
                  statusFilter === key
                    ? `2px solid ${fg}`
                    : "none",
              }}
            >
              <p
                className="font-bold"
                style={{ color: fg }}
              >
                {label}
              </p>

              <p
                className="text-3xl font-extrabold mt-1 figure"
                style={{ color: fg }}
              >
                {counts[key] || 0}
              </p>
            </button>
          )
        )}
      </div>

      {/* Claims Table */}
      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left"
                style={{ color: C.sub }}
              >
                {[
                  "รหัสคำขอ",
                  "รายวิชา",
                  "ภาค",
                  "เดือน",
                  "จำนวนเงิน",
                  "สถานะ",
                  "",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-6 py-4 font-semibold whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pageItems.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() =>
                    goDetail?.(claim.id)
                  }
                  className="border-t cursor-pointer hover:bg-[#F8FBFC] transition-colors"
                  style={{
                    borderColor: C.border,
                  }}
                >
                  <td
                    className="px-6 py-4 font-semibold whitespace-nowrap"
                    style={{
                      color: C.ink,
                    }}
                  >
                    #{claim.code || claim.id}
                  </td>

                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    style={{
                      color: C.ink,
                    }}
                  >
                    {claim.courseCode || "-"}
                  </td>

                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    style={{
                      color: C.sub,
                    }}
                  >
                    {claim.termLabel || "-"}
                  </td>

                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    style={{
                      color: C.sub,
                    }}
                  >
                    {claim.month || "-"}
                  </td>

                  <td
                    className="px-6 py-4 whitespace-nowrap figure"
                    style={{
                      color: C.ink,
                    }}
                  >
                    ฿
                    {Number(
                      claim.amount || 0
                    ).toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    <StatusPill
                      status={claim.status}
                    />
                  </td>

                  <td className="px-6 py-4 text-right">
                    {DELETABLE_STATUSES.includes(claim.status) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          // ไม่ให้คลิกทะลุไปเปิดหน้ารายละเอียด
                          e.stopPropagation();
                          onDelete?.(claim);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-[#FBE2E2]"
                        style={{
                          color: "#C23B3B",
                        }}
                        title="ลบแบบร่าง"
                        aria-label={`ลบแบบร่าง #${claim.code || claim.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center"
                  >
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: C.ink,
                      }}
                    >
                      ไม่พบคำขอ
                    </p>

                    <p
                      className="text-xs mt-1"
                      style={{
                        color: C.sub,
                      }}
                    >
                      ลองเปลี่ยนคำค้นหาหรือ
                      ตัวกรองสถานะ
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onChange={setPage}
        />
      </SectionCard>
    </div>
  );
}