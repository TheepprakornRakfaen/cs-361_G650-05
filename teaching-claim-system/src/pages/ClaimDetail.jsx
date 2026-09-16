import React from "react";
import {
  ArrowLeft,
  FileText,
  Clock3,
  CheckCircle2,
  XCircle,
  Paperclip,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";

const STEPS = [
  {
    key: "Submitted",
    label: "ยื่นคำขอแล้ว",
    icon: FileText,
  },
  {
    key: "Review",
    label: "รอตรวจสอบ",
    icon: Clock3,
  },
  {
    key: "Final",
    label: "ผลการพิจารณา",
    icon: CheckCircle2,
  },
];

export default function ClaimDetail({
  claim,
  course,
  goBack,
}) {
  if (!claim) {
    return (
      <div className="max-w-3xl">
        <SectionCard className="p-10 text-center">
          <p
            className="text-sm font-medium"
            style={{ color: C.ink }}
          >
            ไม่พบข้อมูลคำขอ
          </p>
        </SectionCard>
      </div>
    );
  }

  const status = claim.status;

  let stepIndex = -1;

  if (status === "Submitted") {
    stepIndex = 0;
  } else if (status === "Pending") {
    stepIndex = 1;
  } else if (
    status === "Approved" ||
    status === "Rejected"
  ) {
    stepIndex = 2;
  }

  const rejected = status === "Rejected";

  const amount = Number(claim.amount || 0);

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2 text-sm font-semibold mb-6 transition-opacity hover:opacity-70"
        style={{ color: C.tealDark }}
      >
        <ArrowLeft size={16} />
        กลับไปคำขอของฉัน
      </button>

      <SectionCard className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2
            className="text-xl font-extrabold"
            style={{ color: C.ink }}
          >
            คำขอ #{claim.id}
          </h2>

          <StatusPill status={claim.status} />
        </div>

        {/* Course + Month */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: C.tealSoft,
              color: C.tealDark,
            }}
          >
            {claim.courseCode}

            {course?.name
              ? ` — ${course.name}`
              : ""}
          </span>

          {claim.month && (
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "#EEF2F5",
                color: C.sub,
              }}
            >
              {claim.month}
            </span>
          )}
        </div>

        {/* Status */}
        <div
          className="rounded-2xl p-5 md:p-6 mb-8 border"
          style={{ borderColor: C.border }}
        >
          <p
            className="text-sm font-semibold mb-6"
            style={{ color: C.ink }}
          >
            สถานะคำขอ
          </p>

          <div className="flex items-center">
            {STEPS.map((step, index) => {
              const Icon =
                rejected && index === 2
                  ? XCircle
                  : step.icon;

              const reached =
                index <= stepIndex;

              const isLast =
                index === STEPS.length - 1;

              const color =
                rejected && index === 2
                  ? C.rose
                  : reached
                  ? C.teal
                  : "#C9D6DB";

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center"
                      style={{
                        background: reached
                          ? color
                          : "#E6ECEF",
                      }}
                    >
                      <Icon
                        size={18}
                        style={{
                          color: reached
                            ? "#fff"
                            : "#9AA9AF",
                        }}
                      />
                    </div>

                    <span
                      className="text-[11px] md:text-xs font-medium text-center w-20"
                      style={{
                        color: reached
                          ? C.ink
                          : C.sub,
                      }}
                    >
                      {index === 2 && rejected
                        ? "ไม่อนุมัติ"
                        : index === 2
                        ? "อนุมัติแล้ว"
                        : step.label}
                    </span>
                  </div>

                  {!isLast && (
                    <div
                      className="flex-1 h-[3px] mx-1 rounded-full"
                      style={{
                        background:
                          index < stepIndex
                            ? C.teal
                            : "#E6ECEF",
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-sm mb-8">
          <div>
            <p style={{ color: C.sub }}>
              วันที่สอน
            </p>

            <p
              className="font-semibold mt-0.5"
              style={{ color: C.ink }}
            >
              {claim.teachingDate || "-"}
            </p>
          </div>

          <div>
            <p style={{ color: C.sub }}>
              จำนวนชั่วโมง
            </p>

            <p
              className="font-semibold mt-0.5"
              style={{ color: C.ink }}
            >
              {claim.hours || 0} ชั่วโมง
            </p>
          </div>

          <div>
            <p style={{ color: C.sub }}>
              อัตราค่าตอบแทน
            </p>

            <p
              className="font-semibold mt-0.5"
              style={{ color: C.ink }}
            >
              ฿{Number(claim.rate || 0).toLocaleString()}
              {" / ชั่วโมง"}
            </p>
          </div>

          <div>
            <p style={{ color: C.sub }}>
              จำนวนเงินรวม
            </p>

            <p
              className="font-extrabold mt-0.5 figure"
              style={{ color: C.tealDark }}
            >
              ฿{amount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Notes */}
        {claim.notes && (
          <div className="mb-8">
            <p
              className="text-sm mb-1"
              style={{ color: C.sub }}
            >
              รายละเอียดเพิ่มเติม
            </p>

            <p
              className="text-sm font-medium leading-6"
              style={{ color: C.ink }}
            >
              {claim.notes}
            </p>
          </div>
        )}

        {/* Evidence */}
        <div>
          <p
            className="text-sm mb-2 font-semibold"
            style={{ color: C.ink }}
          >
            หลักฐานเพิ่มเติม
          </p>

          {claim.evidence ? (
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: C.tealDark }}
            >
              <Paperclip size={15} />

              <span className="underline underline-offset-2">
                {claim.evidence}
              </span>
            </div>
          ) : (
            <p
              className="text-sm"
              style={{ color: C.sub }}
            >
              ยังไม่มีไฟล์แนบ
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}