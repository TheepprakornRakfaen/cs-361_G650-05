import React, { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  RefreshCw,
  RotateCcw,
  Loader2,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Check,
  Clock3,
  FileSignature,
  FileText,
  ChevronDown,
  UserCheck,
  Printer,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import {
  CLAIM_STATUS,
  CLAIM_STATUS_META,
  PAPER_FLOW,
  fetchFinanceForUser,
  resetFinanceMock,
  summarizeAssistant,
  summarizeRound,
  sumHours,
  updateAssistantRecord,
} from "../data/financeMock";

const ROUND_LABEL = {
  "SEP-2569": "รอบ ก.ย. 2569",
  "OCT-2569": "รอบ ต.ค. 2569",
};

const ENTRY_STATUS = {
  VERIFIED: { label: "รับรองแล้ว", bg: "#DFF5E6", fg: "#1E8E4F" },
  PENDING: { label: "รอตรวจ", bg: "#FEF6D8", fg: "#9A7B06" },
  REJECTED: { label: "ไม่รับรอง", bg: "#FBE2E2", fg: "#C23B3B" },
};

function formatDate(value, withTime = false) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function Pill({ meta }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.label}
    </span>
  );
}

function Stat({ label, value, tone = C.ink, hint }) {
  return (
    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: C.border }}>
      <p className="text-xs" style={{ color: C.sub }}>{label}</p>
      <p className="text-2xl font-extrabold figure" style={{ color: tone }}>
        {value} <span className="text-sm font-semibold">ชม.</span>
      </p>
      {hint && <p className="text-[11px] mt-0.5" style={{ color: C.sub }}>{hint}</p>}
    </div>
  );
}

function BankLine({ bank }) {
  if (!bank) return <span style={{ color: C.sub }}>-</span>;

  return (
    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: C.ink }}>
      <Landmark size={14} style={{ color: C.tealDark }} />
      {bank.bankName} • {bank.accountMasked}
    </span>
  );
}

/* กระบวนการเอกสารจริง: สถานะในระบบสะท้อนเอกสารกระดาษ ไม่ใช่การลงนาม */
function PaperFlow({ done = [] }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-xs">
      {PAPER_FLOW.map((step, index) => {
        const ok = done.includes(step.key);

        return (
          <React.Fragment key={step.key}>
            <li
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
              style={{
                background: ok ? C.tealSoft : "#EEF2F5",
                color: ok ? C.tealDark : C.sub,
              }}
            >
              {ok ? <Check size={12} /> : <Clock3 size={12} />}
              {step.label}
            </li>
            {index < PAPER_FLOW.length - 1 && (
              <span className="mx-1" style={{ color: C.sub }}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function EvidenceBox({ evidence, ownerCode }) {
  if (!evidence) return null;

  const ownerMatch = !ownerCode || evidence.signedBy === ownerCode;

  return (
    <div className="rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: "#C9B8F0", background: "#FAF8FF" }}>
      <p className="flex items-center gap-1.5 font-bold" style={{ color: C.violet }}>
        <FileSignature size={15} /> {evidence.title}
      </p>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2" style={{ color: C.ink }}>
        <div><dt className="inline" style={{ color: C.sub }}>รหัสหลักฐาน: </dt><dd className="inline">{evidence.id}</dd></div>
        <div><dt className="inline" style={{ color: C.sub }}>ลงนามโดย: </dt><dd className="inline">{evidence.signedBy}</dd></div>
        {evidence.verifiedHours != null && (
          <div><dt className="inline" style={{ color: C.sub }}>ชั่วโมงที่รับรองในเอกสาร: </dt><dd className="inline">{evidence.verifiedHours} ชม.</dd></div>
        )}
        {evidence.signedByAuthority && (
          <div><dt className="inline" style={{ color: C.sub }}>ผู้มีอำนาจ: </dt><dd className="inline">{evidence.signedByAuthority}</dd></div>
        )}
        <div><dt className="inline" style={{ color: C.sub }}>รับเอกสารโดย: </dt><dd className="inline">{evidence.receivedBy} · {formatDate(evidence.receivedAt, true)}</dd></div>
      </dl>
      {ownerCode && (
        <p className="flex items-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: ownerMatch ? "#1E8E4F" : C.rose }}>
          {ownerMatch ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {ownerMatch
            ? `ผู้ลงนามตรงกับอาจารย์เจ้าของรายวิชา (${ownerCode})`
            : `ผู้ลงนามไม่ใช่อาจารย์เจ้าของรายวิชา (${ownerCode})`}
        </p>
      )}
      <p className="text-[11px] mt-2" style={{ color: C.sub }}>{evidence.note}</p>
    </div>
  );
}

function ClaimCard({ claim, sessions, open, onToggle, ownerCode }) {
  const meta = CLAIM_STATUS_META[claim.status];
  const claimSessions = sessions.filter((s) => s.claimId === claim.id);

  return (
    <div className="rounded-2xl border" style={{ borderColor: C.border }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-extrabold" style={{ color: C.ink }}>{claim.id}</span>
        <span className="text-xs" style={{ color: C.sub }}>
          {claim.round} · {claimSessions.map((s) => formatDate(s.date)).join(", ")} · {sumHours(claimSessions)} ชม.
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Pill meta={meta} />
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: C.sub }} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: C.border }}>
          <PaperFlow done={claim.flowDone} />

          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div><dt className="inline" style={{ color: C.sub }}>ผู้สอน: </dt><dd className="inline">{claim.ownerCode}</dd></div>
            <div><dt className="inline" style={{ color: C.sub }}>สถานะ: </dt><dd className="inline">{meta.label} ({meta.th})</dd></div>
            {claim.status === CLAIM_STATUS.PAID && claim.payment ? (
              <>
                <div><dt className="inline" style={{ color: C.sub }}>วันที่จ่าย: </dt><dd className="inline">{formatDate(claim.payment.paidAt)}</dd></div>
                <div><dt className="inline" style={{ color: C.sub }}>เลขอ้างอิง: </dt><dd className="inline">{claim.payment.reference}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="inline" style={{ color: C.sub }}>บัญชีปลายทาง: </dt>
                  <dd className="inline"><BankLine bank={claim.payment} /></dd>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <dt className="inline" style={{ color: C.sub }}>การจ่ายเงิน: </dt>
                <dd className="inline">ยังไม่จ่าย</dd>
              </div>
            )}
          </dl>

          <EvidenceBox evidence={claim.evidence} ownerCode={ownerCode} />
        </div>
      )}
    </div>
  );
}

function TeachingSection({ data }) {
  const [courseId, setCourseId] = useState(data.courses[0]?.id || "");
  const [round, setRound] = useState("OCT-2569");
  const [openClaim, setOpenClaim] = useState(null);

  const course = data.courses.find((c) => c.id === courseId);
  const courseSessions = data.sessions.filter((s) => s.courseId === courseId);
  const rounds = [...new Set(courseSessions.map((s) => s.round))];
  const activeRound = rounds.includes(round) ? round : rounds[0];

  const roundSessions = courseSessions.filter((s) => s.round === activeRound);
  const roundClaims = data.claims.filter(
    (c) => c.courseId === courseId && c.round === activeRound
  );
  const sum = summarizeRound(roundSessions, data.claims);
  const balanced =
    sum.scheduled === sum.paid + sum.submitted + sum.signed + sum.unclaimed;

  if (!course) return null;

  return (
    <SectionCard className="p-6" hoverable={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-extrabold text-lg" style={{ color: C.ink }}>
            {course.code} {course.program} {course.term}
          </p>
          <p className="text-sm" style={{ color: C.sub }}>
            {course.name} · เรียน {course.studyPeriod} · ผู้สอน {course.ownerCode} · {course.status}
          </p>
        </div>

        {data.courses.length > 1 && (
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-full border px-4 py-2 text-sm bg-white"
            style={{ borderColor: C.border }}
          >
            {data.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.term} ({c.ownerCode})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-2 mb-4" role="tablist">
        {rounds.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={r === activeRound}
            onClick={() => setRound(r)}
            className="px-4 py-2 rounded-full text-sm font-semibold border"
            style={
              r === activeRound
                ? { background: C.tealDark, color: "#fff", borderColor: C.tealDark }
                : { color: C.ink, borderColor: C.border }
            }
          >
            {ROUND_LABEL[r] || r}
          </button>
        ))}
      </div>

      {/* ภาพรวมรอบ — คาบละ 1 สถานะ จึงไม่นับซ้ำ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        <Stat label="ตามตาราง" value={sum.scheduled} hint={`${roundSessions.length} คาบ`} />
        <Stat label="จ่ายแล้ว (Paid)" value={sum.paid} tone="#1E8E4F" />
        <Stat label="ยื่นแล้วรอจ่าย (Submitted)" value={sum.submitted} tone="#9A7B06" />
        <Stat label="ได้รับเอกสารลงนาม" value={sum.signed} tone={C.violet} />
        <Stat label="ยังไม่ยื่น (Unclaimed)" value={sum.unclaimed} tone={C.sub} />
      </div>

      <p className="flex items-center gap-1.5 text-sm font-semibold mb-5" style={{ color: balanced ? "#1E8E4F" : C.rose }}>
        {balanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {sum.scheduled} = {[sum.paid, sum.submitted, sum.signed, sum.unclaimed].filter(Boolean).join(" + ") || 0}
        {activeRound === "OCT-2569" && " (ไม่นับคาบสอนรอบ ก.ย.)"}
      </p>

      {/* เทียบตารางสอนกับคำขอ */}
      <div className="overflow-x-auto rounded-2xl border mb-5" style={{ borderColor: C.border }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#F7FAFC", color: C.sub }}>
            <tr>
              {["วันที่สอน", "ชั่วโมง", "คำขอ", "สถานะ"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roundSessions.map((s) => {
              const claim = data.claims.find((c) => c.id === s.claimId);
              const meta = CLAIM_STATUS_META[claim?.status || CLAIM_STATUS.UNCLAIMED];

              return (
                <tr key={s.id} className="border-t" style={{ borderColor: C.border }}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="px-4 py-2.5 figure">{s.hours}</td>
                  <td className="px-4 py-2.5">{claim?.id || "ยังไม่มีคำขอ"}</td>
                  <td className="px-4 py-2.5"><Pill meta={meta} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm font-bold mb-2" style={{ color: C.ink }}>
        รายการเบิก {activeRound}
      </p>
      <div className="space-y-2">
        {roundClaims.length === 0 && (
          <p className="text-sm" style={{ color: C.sub }}>ยังไม่มีคำขอในรอบนี้</p>
        )}
        {roundClaims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            sessions={data.sessions}
            ownerCode={course.ownerCode}
            open={openClaim === claim.id}
            onToggle={() => setOpenClaim(openClaim === claim.id ? null : claim.id)}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function AssistantSection({ record, account, onAction, busy }) {
  const sum = summarizeAssistant(record);
  const isStudent = account.code === record.studentCode;
  const isInstructor = account.code === record.instructorCode;
  const isStaff = account.group === "STAFF";
  const locked = Boolean(record.signedEvidence);

  const button =
    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50";

  return (
    <SectionCard className="p-6" hoverable={false}>
      <div className="mb-4">
        <p className="font-extrabold text-lg" style={{ color: C.ink }}>
          นักศึกษาช่วยงาน {record.studentCode} · {record.course.code} {record.course.program} {record.course.term}
        </p>
        <p className="text-sm" style={{ color: C.sub }}>
          อาจารย์เจ้าของรายวิชา {record.courseOwnerCode} · ผู้รับรอง {record.instructorCode}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <Stat label="ชั่วโมงที่กรอก" value={sum.entered} />
        <Stat label="รับรองแล้ว" value={sum.verified} tone="#1E8E4F" />
        <Stat label="รอตรวจ" value={sum.pending} tone="#9A7B06" />
      </div>
      <p className="text-xs mb-5" style={{ color: C.sub }}>
        ชั่วโมงที่กรอก {sum.entered} ชม. ไม่ใช่ชั่วโมงที่รับรองหรือจ่ายแล้ว — นับจ่ายได้เฉพาะที่รับรองและมีหลักฐานลงนามจริง
      </p>

      <div className="overflow-x-auto rounded-2xl border mb-5" style={{ borderColor: C.border }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#F7FAFC", color: C.sub }}>
            <tr>
              {["รหัส", "วันที่", "งาน", "ชั่วโมง", "สถานะ", ...(isInstructor ? [""] : [])].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {record.entries.map((e) => (
              <tr key={e.id} className="border-t" style={{ borderColor: C.border }}>
                <td className="px-4 py-2.5">{e.id}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(e.date)}</td>
                <td className="px-4 py-2.5">{e.task}</td>
                <td className="px-4 py-2.5 figure">{e.hours}</td>
                <td className="px-4 py-2.5"><Pill meta={ENTRY_STATUS[e.status]} /></td>
                {isInstructor && (
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {e.status === "PENDING" && !locked && (
                      <span className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => onAction("verify", { entryId: e.id })} className="text-xs font-semibold hover:opacity-70" style={{ color: "#1E8E4F" }}>
                          รับรอง
                        </button>
                        <button type="button" disabled={busy} onClick={() => onAction("reject", { entryId: e.id })} className="text-xs font-semibold hover:opacity-70" style={{ color: C.rose }}>
                          ไม่รับรอง
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ขั้นตอน: นักศึกษายืนยัน → อาจารย์รับรองในระบบ → ออกเอกสารลงนามจริง → เจ้าหน้าที่รับหลักฐาน */}
      <ol className="space-y-3 text-sm mb-5">
        <li className="flex flex-wrap items-center gap-3">
          <UserCheck size={16} style={{ color: record.studentConfirmedAt ? "#1E8E4F" : C.sub }} />
          <span>1. {record.studentCode} ยืนยันชั่วโมงที่กรอก</span>
          {record.studentConfirmedAt ? (
            <span className="text-xs" style={{ color: C.sub }}>ยืนยันแล้ว {formatDate(record.studentConfirmedAt, true)}</span>
          ) : isStudent ? (
            <button type="button" disabled={busy} onClick={() => onAction("confirm")} className={button} style={{ background: C.teal }}>
              ยืนยัน {sum.entered} ชม.
            </button>
          ) : (
            <span className="text-xs" style={{ color: C.sub }}>รอนักศึกษายืนยัน</span>
          )}
        </li>

        <li className="flex flex-wrap items-center gap-3">
          <CheckCircle2 size={16} style={{ color: sum.verified ? "#1E8E4F" : C.sub }} />
          <span>2. {record.instructorCode} ตรวจและรับรองในระบบ {sum.verified} ชม. (รอตรวจ {sum.pending} ชม.)</span>
        </li>

        <li className="flex flex-wrap items-center gap-3">
          <Printer size={16} style={{ color: record.docIssuedAt ? "#1E8E4F" : C.sub }} />
          <span>3. ออกเอกสารให้ {record.instructorCode} ลงนามจริงบนกระดาษ</span>
          {record.docIssuedAt ? (
            <span className="text-xs" style={{ color: C.sub }}>ออกเอกสารแล้ว {formatDate(record.docIssuedAt, true)}</span>
          ) : isInstructor ? (
            <button type="button" disabled={busy || !sum.verified} onClick={() => onAction("issueDoc")} className={button} style={{ background: C.tealDark }}>
              <Printer size={14} /> ออกเอกสาร ({sum.verified} ชม.)
            </button>
          ) : (
            <span className="text-xs" style={{ color: C.sub }}>รออาจารย์ออกเอกสาร</span>
          )}
        </li>

        <li className="flex flex-wrap items-center gap-3">
          <FileSignature size={16} style={{ color: locked ? "#1E8E4F" : C.sub }} />
          <span>4. เจ้าหน้าที่บันทึกการรับหลักฐานลงนามจริง</span>
          {locked ? (
            <span className="text-xs" style={{ color: C.sub }}>รับแล้วโดย {record.signedEvidence.receivedBy}</span>
          ) : isStaff ? (
            <button type="button" disabled={busy || !record.docIssuedAt} onClick={() => onAction("receiveEvidence")} className={button} style={{ background: C.violet }}>
              <FileSignature size={14} /> บันทึกรับหลักฐานลงนาม
            </button>
          ) : (
            <span className="text-xs" style={{ color: C.sub }}>รอเจ้าหน้าที่รับเอกสาร</span>
          )}
        </li>
      </ol>

      <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: C.ember }}>
        <AlertTriangle size={14} /> การกด "รับรอง" ในระบบไม่ถือเป็นลายเซ็นจริง ต้องมีเอกสารลงนามบนกระดาษเสมอ
      </p>

      <EvidenceBox evidence={record.signedEvidence} ownerCode={record.courseOwnerCode} />

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold" style={{ color: C.tealDark }}>
          ประวัติรายการ ({record.history.length})
        </summary>
        <ul className="mt-2 space-y-1">
          {record.history.map((h, i) => (
            <li key={i} style={{ color: C.ink }}>
              <span style={{ color: C.sub }}>{formatDate(h.at, true)}</span> · <b>{h.actor}</b> {h.text}
            </li>
          ))}
        </ul>
      </details>
    </SectionCard>
  );
}

/*
 * [V3][Project 6] หน้าการเงิน — ข้อมูลทั้งหมดผูกกับ Cognito sub ของผู้ที่ล็อกอิน
 *  - อาจารย์เห็นคาบสอน คำขอ และบัญชีปลายทาง "ของตนเอง" แบบปกปิดเท่านั้น
 *  - นักศึกษาช่วยงานเห็น/ยืนยันชั่วโมงของตนเอง อาจารย์เจ้าของวิชารับรอง เจ้าหน้าที่รับหลักฐาน
 */
export default function Finance({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchFinanceForUser(user));
      setLoadedAt(new Date());
    } catch (err) {
      setError(err?.message || "ไม่สามารถโหลดข้อมูลการเงินได้");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (recordId, action, payload) => {
    setBusy(true);
    setError("");

    try {
      await updateAssistantRecord(user, recordId, action, payload);
      await load();
    } catch (err) {
      setError(err?.message || "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("คืนข้อมูลทดสอบกลับเป็น baseline ตามเอกสาร Setup?")) return;
    resetFinanceMock();
    await load();
  };

  const account = data?.account;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        icon={Wallet}
        title="การเงิน"
        description="ตรวจชั่วโมงสอน รายการเบิก บัญชีปลายทาง และชั่วโมงนักศึกษาช่วยงาน (ข้อมูลจำลอง)"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold bg-white hover:bg-[#E8F0FA]"
              style={{ borderColor: C.border, color: C.tealDark }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold bg-white hover:bg-[#FDEBDD]"
              style={{ borderColor: C.border, color: C.ember }}
            >
              <RotateCcw size={15} /> Reset ข้อมูล
            </button>
          </div>
        }
      />

      {error && (
        <SectionCard className="px-5 py-3" hoverable={false}>
          <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.rose }}>
            <AlertTriangle size={15} /> {error}
          </p>
        </SectionCard>
      )}

      {loading && !data ? (
        <SectionCard className="p-10 text-center" hoverable={false}>
          <Loader2 size={28} className="mx-auto mb-3 animate-spin" style={{ color: C.sub }} />
          <p className="text-sm font-medium" style={{ color: C.ink }}>กำลังโหลดข้อมูลการเงิน...</p>
        </SectionCard>
      ) : !account ? (
        <SectionCard className="p-10 text-center" hoverable={false}>
          <FileText size={28} className="mx-auto mb-3" style={{ color: C.sub }} />
          <p className="text-sm font-medium" style={{ color: C.ink }}>
            ไม่พบข้อมูลการเงินที่ผูกกับบัญชีนี้
          </p>
          <p className="text-xs mt-2 break-all" style={{ color: C.sub }}>
            Cognito sub: <code>{data?.sub || user?.cognitoSub || "-"}</code>
          </p>
          <p className="text-xs mt-1" style={{ color: C.sub }}>
            ใส่ sub นี้ใน VITE_SUB_INST_A / INST_B / STAFF_1 / STU_A (.env.local) หรือ TEMP_COGNITO_SUB ใน data/financeMock.js
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard className="p-5" hoverable={false}>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
              <div>
                <p className="text-xs" style={{ color: C.sub }}>ผู้ใช้</p>
                <p className="font-bold" style={{ color: C.ink }}>{account.name}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: C.sub }}>บัญชีรับเงินของฉัน (ปกปิด)</p>
                <BankLine bank={account.bank} />
              </div>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: C.sub }}>Cognito sub</p>
                <code className="text-xs break-all" style={{ color: C.ink }}>{data.sub}</code>
              </div>
              {loadedAt && (
                <p className="text-xs ml-auto" style={{ color: C.sub }}>
                  อ่านข้อมูลล่าสุด {loadedAt.toLocaleTimeString("th-TH")}
                </p>
              )}
            </div>
          </SectionCard>

          {data.courses.length > 0 && <TeachingSection data={data} />}

          {data.assistantRecords.map((record) => (
            <AssistantSection
              key={record.id}
              record={record}
              account={account}
              busy={busy}
              onAction={(action, payload) => runAction(record.id, action, payload)}
            />
          ))}

          {data.courses.length === 0 && data.assistantRecords.length === 0 && (
            <SectionCard className="p-10 text-center" hoverable={false}>
              <p className="text-sm" style={{ color: C.sub }}>ยังไม่มีรายการการเงินของบัญชีนี้</p>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
