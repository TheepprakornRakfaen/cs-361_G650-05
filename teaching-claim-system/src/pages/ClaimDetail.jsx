import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  FileText,
  Paperclip,
  Pencil,
  Eye,
  ExternalLink,
  X,
  RefreshCw,
  Image as ImageIcon,
  Lock,
  Upload,
  Loader2,
  History,
  AlertTriangle,
  User as UserIcon,
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
  getClaimHistory,
} from "../services/api";

import WorkflowStepper from "../components/WorkflowStepper";
import ReviewActionPanel from "../components/ReviewActionPanel";
import AuditTimeline, {
  normalizeHistory,
} from "../components/AuditTimeline";
import Restricted from "../components/Restricted";
import {
  ATTACHABLE_STATUSES,
  EDITABLE_STATUSES,
  STATUS,
  getAllowedActions,
  isOwnClaim,
} from "../data/workflow";
import {
  PERMISSION as P,
  can,
  maskEmail,
} from "../data/roles";

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

  if (error?.status === 403) {
    return "คุณไม่มีสิทธิ์เข้าถึงเอกสารประกอบของคำขอนี้";
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
  user,
  goBack,
  backLabel = "กลับไปคำขอของฉัน",
  onEdit,
  // [V3] (claimId, action, comment) => Promise — โยน error ออกมาเมื่อ backend ปฏิเสธ
  onAction,
  // ไฟล์แนบที่ค้าง (อัปโหลด/บันทึกไม่สำเร็จ) ของคำขอนี้ — มี File เก็บไว้ให้ลองใหม่
  pendingEvidence = [],
  // (claimId, File[] | pendingItems[]) => Promise<{ registered, failed }>
  onAttachEvidence,
}) {
  const canViewEvidence = can(user, P.EVIDENCE_VIEW);
  const canViewFinance = can(user, P.FINANCE_VIEW);
  const canViewPii = can(user, P.PII_VIEW);
  const canViewAudit = can(user, P.AUDIT_VIEW);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyForbidden, setHistoryForbidden] = useState(false);
  const [historyReload, setHistoryReload] = useState(0);

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

  const [attaching, setAttaching] = useState(false);
  const [attachMessage, setAttachMessage] = useState("");
  const fileInputRef = useRef(null);

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

      if (!isUuid || !canViewEvidence) {
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
    canViewEvidence,
  ]);

  /*
   * [V3] ประวัติการดำเนินการ — โหลดใหม่เมื่อสถานะเปลี่ยน (หลังตรวจ/อนุมัติ)
   */
  useEffect(() => {
    let active = true;

    const claimId = claim?.claimId || claim?.id;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(claimId || "")
      );

    setHistoryForbidden(false);
    setHistoryError("");

    if (!isUuid || !canViewAudit) {
      setHistory([]);
      return undefined;
    }

    setHistoryLoading(true);

    getClaimHistory(claimId)
      .then((data) => {
        if (!active) return;

        const rows = Array.isArray(data?.history)
          ? data.history
          : Array.isArray(data)
            ? data
            : [];

        setHistory(rows.map(normalizeHistory));
      })
      .catch((error) => {
        if (!active) return;

        setHistory([]);

        if (error?.status === 403) {
          setHistoryForbidden(true);
        } else {
          setHistoryError(
            error?.message || "ไม่สามารถโหลดประวัติได้"
          );
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    claim?.id,
    claim?.claimId,
    claim?.status,
    historyReload,
    canViewAudit,
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

  const own = isOwnClaim(claim, user);

  // ผู้ยื่นแก้ไขได้เฉพาะคำขอของตัวเองที่เป็นแบบร่าง / ถูกส่งกลับ
  const canEdit =
    can(user, P.CLAIM_CREATE) &&
    EDITABLE_STATUSES.includes(status) &&
    (own || !claim.ownerSub);

  /*
   * แนบไฟล์เพิ่ม / ลองอัปโหลดซ้ำ — เฉพาะเจ้าของคำขอ ขณะยังรอตรวจสอบหรือถูกส่งกลับ
   * (หลังตรวจสอบผ่านแล้วห้ามเปลี่ยนเอกสาร) backend ต้องบังคับกฎนี้ด้วย
   */
  const claimIdForFiles = claim.claimId || claim.id;

  const canAttach =
    Boolean(onAttachEvidence) &&
    can(user, P.CLAIM_CREATE) &&
    (own || !claim.ownerSub) &&
    ATTACHABLE_STATUSES.includes(status) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(claimIdForFiles || ""));

  const attach = async (entries) => {
    if (entries.length === 0 || attaching) return;

    setAttaching(true);
    setAttachMessage("");

    try {
      const result = await onAttachEvidence(claimIdForFiles, entries);

      setEvidenceReload((n) => n + 1);

      setAttachMessage(
        result.failed.length === 0
          ? `แนบไฟล์สำเร็จ ${result.registered.length} ไฟล์`
          : `แนบสำเร็จ ${result.registered.length} ไฟล์ ไม่สำเร็จ ${result.failed.length} ไฟล์`
      );
    } catch (error) {
      setAttachMessage(
        error?.data?.message || error?.message || "แนบไฟล์ไม่สำเร็จ"
      );
    } finally {
      setAttaching(false);
    }
  };

  const { actions, blockedReason } = getAllowedActions(claim, user);

  const showDecision =
    claim.decisionComment &&
    (status === STATUS.RETURNED || status === STATUS.REJECTED);

  const amount =
    claim.amount === null || claim.amount === undefined
      ? null
      : Number(claim.amount);

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
        {backLabel}
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
            {canEdit && (
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
                {status === STATUS.DRAFT
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

          <WorkflowStepper status={status} />
        </div>

        {/* [V3] เหตุผลจากผู้ตรวจ/ผู้อนุมัติ */}
        {showDecision && (
          <div
            className="flex gap-3 rounded-2xl p-4 mb-8 border"
            style={{
              background:
                status === STATUS.REJECTED ? "#FDF1F1" : "#FFF7EE",
              borderColor:
                status === STATUS.REJECTED ? "#F3C9C9" : "#F6D9BC",
            }}
            role="note"
          >
            <AlertTriangle
              size={18}
              className="shrink-0 mt-0.5"
              style={{
                color:
                  status === STATUS.REJECTED ? "#C23B3B" : "#B4531A",
              }}
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {status === STATUS.REJECTED
                  ? "เหตุผลที่ไม่อนุมัติ"
                  : "สิ่งที่ต้องแก้ไข"}
              </p>

              <p
                className="text-sm mt-1 leading-6 whitespace-pre-wrap break-words"
                style={{ color: C.ink }}
              >
                {claim.decisionComment}
              </p>
            </div>
          </div>
        )}

        {/* [V3] ปุ่มพิจารณา (แสดงเฉพาะผู้มีสิทธิ์ในสถานะนั้น) */}
        <ReviewActionPanel
          actions={actions}
          blockedReason={blockedReason}
          onAction={(action, comment) =>
            onAction?.(claim.id, action, comment)
          }
        />

        {/* [V3] ข้อมูลผู้ยื่น — แสดงเมื่อเปิดดูคำขอของผู้อื่น */}
        {claim.claimantName && !own && (
          <div
            className="flex items-center gap-3 rounded-2xl p-4 mb-8 border"
            style={{ borderColor: C.border }}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: C.tealSoft, color: C.tealDark }}
            >
              <UserIcon size={18} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {claim.claimantName}
              </p>

              {claim.claimantEmail && (
                <p className="text-xs" style={{ color: C.sub }}>
                  {canViewPii
                    ? claim.claimantEmail
                    : maskEmail(claim.claimantEmail)}
                </p>
              )}
            </div>
          </div>
        )}

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
              <Restricted
                allowed={canViewFinance}
                value={claim.rate}
              >
                ฿{Number(claim.rate || 0).toLocaleString()}
                {" / ชั่วโมง"}
              </Restricted>
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
              <Restricted
                allowed={canViewFinance}
                value={amount}
              >
                ฿{Number(amount).toLocaleString()}
              </Restricted>
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
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <p
              className="text-sm font-semibold"
              style={{ color: C.ink }}
            >
              หลักฐานเพิ่มเติม
            </p>

            {canAttach && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    attach(files);
                  }}
                />

                <button
                  type="button"
                  disabled={attaching}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-opacity hover:opacity-80 disabled:opacity-60"
                  style={{ borderColor: C.border, color: C.tealDark }}
                >
                  {attaching ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  แนบไฟล์เพิ่ม
                </button>
              </>
            )}
          </div>

          {attachMessage && (
            <p className="text-xs mb-2" style={{ color: C.sub }} aria-live="polite">
              {attachMessage}
            </p>
          )}

          {pendingEvidence.length > 0 && (
            <div
              className="rounded-xl border p-3 mb-3"
              style={{ borderColor: "#F3C9C9", background: "#FDF1F1" }}
              role="alert"
            >
              <p
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "#C23B3B" }}
              >
                <AlertTriangle size={15} />
                แนบไฟล์ไม่สำเร็จ {pendingEvidence.length} ไฟล์ — คำขอถูกยื่นเรียบร้อยแล้ว
              </p>

              <ul className="mt-2 text-xs flex flex-col gap-1" style={{ color: C.ink }}>
                {pendingEvidence.map((item) => (
                  <li key={item.fileName}>
                    {item.fileName}
                    <span style={{ color: C.sub }}> · {item.message}</span>
                  </li>
                ))}
              </ul>

              {canAttach && (
                <button
                  type="button"
                  disabled={attaching}
                  onClick={() => attach(pendingEvidence)}
                  className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "#C23B3B" }}
                >
                  {attaching ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  ลองอีกครั้ง
                </button>
              )}
            </div>
          )}

          {!canViewEvidence ? (
            <p
              className="flex items-center gap-2 text-sm"
              style={{ color: C.sub }}
            >
              <Lock size={14} />
              คุณไม่มีสิทธิ์ดูเอกสารประกอบ
            </p>
          ) : evidenceLoading ? (
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

        {/* [V3] ประวัติการดำเนินการ */}
        {canViewAudit && (
          <div
            className="mt-8 pt-8 border-t"
            style={{ borderColor: C.border }}
          >
            <p
              className="flex items-center gap-2 text-sm mb-4 font-semibold"
              style={{ color: C.ink }}
            >
              <History size={16} />
              ประวัติการดำเนินการ
            </p>

            <AuditTimeline
              items={history}
              loading={historyLoading}
              error={historyError}
              forbidden={historyForbidden}
              onRetry={() => setHistoryReload((n) => n + 1)}
            />
          </div>
        )}
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