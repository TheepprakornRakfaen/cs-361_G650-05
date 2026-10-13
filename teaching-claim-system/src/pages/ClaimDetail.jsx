import React, {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  FileText,
  Clock3,
  CheckCircle2,
  XCircle,
  Paperclip,
  Pencil,
  Eye,
  ExternalLink,
  X,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import StatusPill from "../components/StatusPill";
import {
  sessionMinutes,
  formatDuration,
  formatThaiDate,
} from "../utils/time";

import {
  getClaimEvidence,
} from "../services/api";

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

/*
 * GET /api/claims/{id}/evidence อาจส่ง field เป็น snake_case หรือ camelCase
 * download_url = presigned GET URL ของ S3 (มีอายุ) → หมดอายุให้กด "ลองใหม่" เพื่อขอ URL ใหม่
 */
function normalizeEvidence(item) {
  const fileName =
    item.file_name ||
    item.fileName ||
    String(item.object_key || item.objectKey || "")
      .split("/")
      .pop() ||
    "ไฟล์แนบ";

  const contentType =
    item.content_type ||
    item.contentType ||
    "";

  const lower = fileName.toLowerCase();

  const isImage =
    contentType.startsWith("image/") ||
    /\.(png|jpe?g)$/.test(lower);

  const isPdf =
    contentType === "application/pdf" ||
    lower.endsWith(".pdf");

  return {
    id:
      item.id ||
      item.evidence_id ||
      item.evidenceId ||
      fileName,
    fileName,
    fileSize: Number(
      item.file_size || item.fileSize || 0
    ),
    url:
      item.download_url ||
      item.downloadUrl ||
      item.url ||
      "",
    isImage,
    isPdf,
  };
}

// "Failed to fetch" = request ไปไม่ถึง/โดน CORS → แปลเป็นข้อความที่ผู้ใช้เข้าใจ
function evidenceErrorText(error) {
  const message =
    error?.data?.message ||
    error?.message ||
    "";

  if (
    message === "Failed to fetch" ||
    message.includes("NetworkError")
  ) {
    return "เชื่อมต่อเซิร์ฟเวอร์หลักฐานไม่ได้";
  }

  if (error?.status === 404) {
    return "ไม่พบหลักฐานของคำขอนี้";
  }

  return message || "ไม่สามารถโหลดหลักฐานได้";
}

function EvidencePreview({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () =>
      window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 30, 45, 0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.fileName}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 border-b"
          style={{ borderColor: C.border }}
        >
          <p
            className="text-sm font-semibold truncate"
            style={{ color: C.ink }}
          >
            {item.fileName}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:bg-[#EEF4F8]"
              style={{ color: C.tealDark }}
            >
              <ExternalLink size={14} />
              เปิดแท็บใหม่
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#EEF4F8]"
              style={{ color: C.sub }}
              aria-label="ปิด"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-auto flex items-center justify-center"
          style={{ background: "#F4F7F9" }}
        >
          {item.isImage ? (
            <img
              src={item.url}
              alt={item.fileName}
              className="max-w-full max-h-[78vh] object-contain"
            />
          ) : item.isPdf ? (
            <iframe
              src={item.url}
              title={item.fileName}
              className="w-full h-[78vh] border-0"
            />
          ) : (
            <p
              className="text-sm p-10"
              style={{ color: C.sub }}
            >
              ดูตัวอย่างไฟล์นี้ไม่ได้ กด “เปิดแท็บใหม่” เพื่อดาวน์โหลด
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClaimDetail({
  claim,
  course,
  goBack,
  onEdit,
}) {
  const [
    evidenceItems,
    setEvidenceItems,
  ] = useState([]);

  const [
    evidenceLoading,
    setEvidenceLoading,
  ] = useState(false);

  const [
    evidenceError,
    setEvidenceError,
  ] = useState("");

  const [previewItem, setPreviewItem] =
    useState(null);

  // เพิ่มค่าเพื่อโหลดหลักฐานใหม่ (ปุ่ม "ลองใหม่" / URL หมดอายุ)
  const [evidenceReload, setEvidenceReload] =
    useState(0);

  useEffect(() => {
    let active = true;

    async function loadEvidence() {
      const claimId =
        claim?.claimId ||
        claim?.id;

      /*
      * localStorage Draft เก่าอาจใช้
      * CL-xxxx แทน UUID
      */
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          String(claimId || "")
        );

      if (!isUuid) {
        setEvidenceItems([]);
        return;
      }

      setEvidenceLoading(true);
      setEvidenceError("");

      try {
        const data =
          await getClaimEvidence(
            claimId
          );

        if (!active) {
          return;
        }

        const items =
          Array.isArray(
            data?.evidence
          )
            ? data.evidence.map(normalizeEvidence)
            : [];

        setEvidenceItems(
          items
        );

        console.log(
          "GET Claim Evidence:",
          {
            claimId,
            count:
              data?.count,
            hasEvidence:
              data?.hasEvidence,
            evidence:
              items,
          }
        );
      } catch (error) {
        console.error(
          "Load evidence error:",
          error
        );

        if (active) {
          setEvidenceItems([]);

          setEvidenceError(
            evidenceErrorText(error)
          );
        }
      } finally {
        if (active) {
          setEvidenceLoading(false);
        }
      }
    }

    loadEvidence();

    return () => {
      active = false;
    };
  }, [
    claim?.id,
    claim?.claimId,
    evidenceReload,
  ]);
  
  if (!claim) {
    return (
      <div className="w-full">
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

  // คำขอแบบใหม่มีหลายวัน (sessions) คำขอเก่ามีแค่ teachingDate
  const sessions = Array.isArray(claim.sessions)
    ? [...claim.sessions].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      )
    : [];

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2 text-sm font-semibold mb-6 transition-opacity hover:opacity-70"
        style={{ color: C.tealDark }}
      >
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full border-2"
          style={{ borderColor: C.tealDark }}
        >
          <ArrowLeft size={14} />
        </span>
        กลับไปคำขอของฉัน
      </button>

      <SectionCard className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2
            className="text-xl font-extrabold"
            style={{ color: C.ink }}
          >
            คำขอ #{claim.code || claim.id}
          </h2>

          <div className="flex items-center gap-2">
            {(status === "Draft" ||
              status === "Rejected") && (
              <button
                type="button"
                onClick={() =>
                  onEdit?.(claim.id)
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-opacity hover:opacity-80"
                style={{
                  borderColor: C.border,
                  color: C.tealDark,
                }}
              >
                <Pencil size={13} />
                {status === "Draft"
                  ? "แก้ไขร่าง"
                  : "แก้ไขและยื่นใหม่"}
              </button>
            )}

            <StatusPill status={claim.status} />
          </div>
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
              {sessions.length > 1 ? ` (${sessions.length} วัน)` : ""}
            </p>

            {sessions.length > 0 ? (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {sessions.map((session) => (
                  <p
                    key={session.date}
                    className="font-semibold"
                    style={{ color: C.ink }}
                  >
                    {formatThaiDate(session.date)}
                    <span className="font-normal" style={{ color: C.sub }}>
                      {" "}· {formatDuration(sessionMinutes(session))}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p
                className="font-semibold mt-0.5"
                style={{ color: C.ink }}
              >
                {formatThaiDate(claim.teachingDate)}
              </p>
            )}
          </div>

          <div>
            <p style={{ color: C.sub }}>
              เวลาสอนรวม
            </p>

            <p
              className="font-semibold mt-0.5"
              style={{ color: C.ink }}
            >
              {formatDuration(
                sessions.length > 0
                  ? sessions.reduce((sum, s) => sum + sessionMinutes(s), 0)
                  : Number(claim.hours || 0) * 60
              )}
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

          {evidenceLoading ? (
            <p
              className="text-sm"
              style={{
                color: C.sub,
              }}
            >
              กำลังโหลดหลักฐาน...
            </p>
          ) : evidenceError ? (
            <div className="flex items-center gap-3 flex-wrap">
              <p
                className="text-sm"
                style={{
                  color: C.rose,
                }}
              >
                {evidenceError}
              </p>

              <button
                type="button"
                onClick={() =>
                  setEvidenceReload((n) => n + 1)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-opacity hover:opacity-80"
                style={{
                  borderColor: C.border,
                  color: C.tealDark,
                }}
              >
                <RefreshCw size={13} />
                ลองใหม่
              </button>
            </div>
          ) : evidenceItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {evidenceItems.map((item) => {
                const FileIcon = item.isImage
                  ? ImageIcon
                  : item.isPdf
                    ? FileText
                    : Paperclip;

                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={!item.url}
                    onClick={() =>
                      setPreviewItem(item)
                    }
                    className="flex items-center gap-3 p-3 rounded-xl border text-left transition-colors hover:bg-[#F4F8FB] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: C.border,
                    }}
                    title={
                      item.url
                        ? "กดเพื่อดูไฟล์"
                        : "ไม่มีลิงก์ดาวน์โหลด"
                    }
                  >
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: C.tealSoft,
                        color: C.tealDark,
                      }}
                    >
                      <FileIcon size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-sm font-semibold truncate"
                        style={{ color: C.ink }}
                      >
                        {item.fileName}
                      </span>

                      <span
                        className="block text-xs"
                        style={{ color: C.sub }}
                      >
                        {item.isPdf
                          ? "PDF"
                          : item.isImage
                            ? "รูปภาพ"
                            : "ไฟล์"}
                        {item.fileSize > 0 &&
                          ` · ${(
                            item.fileSize /
                            1024 /
                            1024
                          ).toFixed(2)} MB`}
                      </span>
                    </span>

                    <Eye
                      size={16}
                      className="shrink-0"
                      style={{ color: C.tealDark }}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <p
              className="text-sm"
              style={{
                color: C.sub,
              }}
            >
              ยังไม่มีไฟล์แนบ
            </p>
          )}
        </div>
      </SectionCard>

      {previewItem && (
        <EvidencePreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}