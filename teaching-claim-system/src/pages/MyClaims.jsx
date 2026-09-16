import React, {
  useMemo,
  useState,
} from "react";

import {
  Search,
  Plus,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";

export default function MyClaims({
  claims = [],
  goDetail,
  goCreate,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const counts = useMemo(() => {
    const result = {
      Draft: 0,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
    };

    claims.forEach((claim) => {
      if (result[claim.status] !== undefined) {
        result[claim.status] += 1;
      }
    });

    return result;
  }, [claims]);

  const filtered = useMemo(() => {
    const keyword =
      query.trim().toLowerCase();

    return claims.filter((claim) => {
      const matchesQuery =
        keyword === "" ||
        String(claim.id)
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
    claims,
    query,
    statusFilter,
  ]);

  const statusCards = [
    [
      "Draft",
      "แบบร่าง",
      "#EDF0F2",
      "#5B6672",
    ],
    [
      "Pending",
      "รอตรวจสอบ",
      "#FEF6D8",
      "#9A7B06",
    ],
    [
      "Approved",
      "อนุมัติแล้ว",
      "#DFF5E6",
      "#1E8E4F",
    ],
    [
      "Rejected",
      "ไม่อนุมัติ",
      "#FBE2E2",
      "#C23B3B",
    ],
  ];

  return (
    <div>
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

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="rounded-full border px-4 py-2.5 text-sm font-medium bg-white outline-none"
          style={{
            borderColor: C.border,
            color: C.ink,
          }}
        >
          <option value="All">
            ทุกสถานะ
          </option>

          <option value="Draft">
            แบบร่าง
          </option>

          <option value="Pending">
            รอตรวจสอบ
          </option>

          <option value="Approved">
            อนุมัติแล้ว
          </option>

          <option value="Rejected">
            ไม่อนุมัติ
          </option>
        </select>

        <button
          type="button"
          onClick={goCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-white text-sm md:ml-auto transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
          }}
        >
          สร้างคำขอ
          <Plus size={16} />
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
                  "เดือน",
                  "จำนวนเงิน",
                  "สถานะ",
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
              {filtered.map((claim) => (
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
                    #{claim.id}
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
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
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
      </SectionCard>
    </div>
  );
}