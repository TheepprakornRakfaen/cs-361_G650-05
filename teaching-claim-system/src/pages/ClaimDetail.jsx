import React from "react";
import { ArrowLeft, FileText, Clock3, CheckCircle2, XCircle, Paperclip } from "lucide-react";
import { C } from "../theme";
import { courseByCode } from "../data/mockData";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";

const STEPS = [
  { key: "Submitted", label: "ยื่นคำขอแล้ว", icon: FileText },
  { key: "Review", label: "รอตรวจสอบ", icon: Clock3 },
  { key: "Final", label: "ผลการพิจารณา", icon: CheckCircle2 },
];

export default function ClaimDetail({ claim, goBack }) {
  if (!claim) return null;
  const course = courseByCode(claim.courseCode);
  const stepIndex = claim.status === "Draft" ? -1 : claim.status === "Pending" ? 1 : 2;
  const rejected = claim.status === "Rejected";

  return (
    <div className="max-w-3xl">
      <button onClick={goBack} className="flex items-center gap-2 text-sm font-semibold mb-6" style={{ color: C.tealDark }}>
        <ArrowLeft size={16} /> กลับไปคำขอของฉัน
      </button>

      <SectionCard className="p-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-extrabold" style={{ color: C.ink }}>คำขอ #{claim.id}</h2>
          <StatusPill status={claim.status} />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.tealSoft, color: C.tealDark }}>
            {claim.courseCode} — {course.name}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "#EEF2F5", color: C.sub }}>
            {claim.month}
          </span>
        </div>

        <div className="rounded-2xl p-6 mb-8 border" style={{ borderColor: C.border }}>
          <p className="text-sm font-semibold mb-6" style={{ color: C.ink }}>สถานะคำขอ</p>
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const Icon = rejected && i === 2 ? XCircle : s.icon;
              const reached = i <= stepIndex;
              const isLast = i === STEPS.length - 1;
              const color = rejected && i === 2 ? "#C23B3B" : reached ? C.teal : "#C9D6DB";
              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: reached ? color : "#E6ECEF" }}>
                      <Icon size={19} style={{ color: reached ? "#fff" : "#9AA9AF" }} />
                    </div>
                    <span className="text-xs font-medium text-center w-20" style={{ color: reached ? C.ink : C.sub }}>
                      {i === 2 && rejected ? "ไม่อนุมัติ" : i === 2 ? "อนุมัติแล้ว" : s.label}
                    </span>
                  </div>
                  {!isLast && <div className="flex-1 h-[3px] mx-1 rounded-full" style={{ background: i < stepIndex ? C.teal : "#E6ECEF" }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-8">
          {[
            ["วันที่สอน", claim.teachingDate],
            ["จำนวนชั่วโมง", `${claim.hours} ชั่วโมง`],
            ["อัตราค่าตอบแทน", `฿${claim.rate} / ชั่วโมง`],
            ["จำนวนเงินรวม", `฿${claim.amount.toLocaleString()}`],
          ].map(([label, val]) => (
            <div key={label}>
              <p style={{ color: C.sub }}>{label}</p>
              <p className="font-semibold mt-0.5" style={{ color: C.ink }}>{val}</p>
            </div>
          ))}
        </div>

        {claim.notes && (
          <div className="mb-8">
            <p className="text-sm mb-1" style={{ color: C.sub }}>รายละเอียดเพิ่มเติม</p>
            <p className="text-sm font-medium" style={{ color: C.ink }}>{claim.notes}</p>
          </div>
        )}

        <div>
          <p className="text-sm mb-2" style={{ color: C.ink, fontWeight: 600 }}>หลักฐานเพิ่มเติม</p>
          {claim.evidence ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.tealDark }}>
              <Paperclip size={15} />
              <span className="underline underline-offset-2">{claim.evidence}</span>
            </div>
          ) : (
            <p className="text-sm" style={{ color: C.sub }}>ยังไม่มีไฟล์แนบ</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
