import React, { useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Pencil,
  Send,
  Save,
  Plus,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import Field from "../components/Field";
import Select from "../components/Select";
import SummaryRow from "../components/SummaryRow";
import NumberCombo from "../components/NumberCombo";
import {
  sessionMinutes,
  formatDuration,
  hoursToParts,
  formatThaiDate,
  roundMoney,
} from "../utils/time";

const STEP_TITLES = [
  "ข้อมูล",
  "รายละเอียดคำขอ",
  "หลักฐานประกอบการเบิก",
  "ตรวจสอบความถูกต้อง",
];

/*
 * ขอบเขตข้อมูลที่ยอมให้กรอก (กันข้อมูลผิด เช่น ปี 0309 หรือชั่วโมงติดลบ)
 * TODO: SEMESTER_START ใช้ 1 มิ.ย. 2569 ไปก่อน รอยืนยันวันเปิดภาค 1/2569
 */
const SEMESTER_START = "2026-06-01";
const MAX_HOURS_PER_DAY = 12;
const MAX_SESSIONS = 20;

// ตัวเลือกในช่องเวลา (พิมพ์เลขอื่นเองได้ เช่น 47 นาที)
const HOUR_OPTIONS = Array.from({ length: MAX_HOURS_PER_DAY + 1 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);
const MAX_NOTES_LENGTH = 500;
const MAX_FILE_MB = 10;
const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

// วันนี้ในรูปแบบ YYYY-MM-DD ตามเวลาเครื่อง (ใช้กับ min/max ของ input type="date")
function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// ตรวจวันที่สอน คืนข้อความ error หรือ "" ถ้าถูกต้อง
function validateTeachingDate(value) {
  if (!value) {
    return "กรุณาระบุวันที่สอน";
  }

  const date = new Date(`${value}T00:00:00`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    return "รูปแบบวันที่ไม่ถูกต้อง";
  }

  if (value < SEMESTER_START) {
    return `วันที่สอนต้องไม่ก่อนวันเปิดภาค (${formatThaiDate(SEMESTER_START)})`;
  }

  if (value > todayISO()) {
    return "ยังเบิกวันที่ยังไม่ถึงไม่ได้";
  }

  return "";
}

// ตรวจเวลาสอนของวันสอน 1 แถว (ชั่วโมง + นาที) คืนข้อความ error หรือ ""
function validateSessionTime(session) {
  if (session.hours === "" && session.minutes === "") {
    return "กรุณาระบุเวลาสอน";
  }

  if (Number(session.minutes || 0) > 59) {
    return "นาทีต้องอยู่ระหว่าง 0–59";
  }

  const minutes = sessionMinutes(session);

  if (minutes <= 0) {
    return "เวลาสอนต้องมากกว่า 0";
  }

  if (minutes > MAX_HOURS_PER_DAY * 60) {
    return `ไม่เกิน ${MAX_HOURS_PER_DAY} ชั่วโมงต่อวัน`;
  }

  return "";
}

let sessionCounter = 0;

// แถววันสอนเปล่า (id ใช้เป็น key ของ React)
function emptySession() {
  sessionCounter += 1;
  return {
    id: `s-${Date.now()}-${sessionCounter}`,
    date: "",
    hours: "",
    minutes: "",
  };
}

// ตรวจไฟล์หลักฐาน คืนข้อความ error หรือ "" ถ้าถูกต้อง
function validateFile(file) {
  const name = file.name.toLowerCase();

  if (!ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "รองรับเฉพาะไฟล์ PDF, JPG, PNG";
  }

  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `ไฟล์ต้องมีขนาดไม่เกิน ${MAX_FILE_MB} MB`;
  }

  return "";
}

export default function CreateClaim({
  presetCourse,
  presetRound,
  initialClaim,
  courses = [],
  rounds = [],
  terms = [],
  periods = [],
  selectedTermId,
  onTermChange,
  selectedPeriodId,
  onPeriodChange,
  termLoading = false,
  periodLoading = false,
  courseLoading = false,
  courseError = "",
  termError = "",
  onSubmit,
  onSaveDraft,
  user,
  onCancel,
}) {
  const isEditing = Boolean(initialClaim);

  const normalizeCourse = (course) => {
    if (!course) return null;

    const role = course.role || "";

    const positionLabel =
      role === "INSTRUCTOR"
        ? "อาจารย์ผู้สอน"
        : role === "TA"
          ? "ผู้ช่วยสอน (TA)"
          : role || "ไม่ระบุตำแหน่ง";

    return {
      ...course,

      // รองรับทั้งข้อมูลเก่าและข้อมูลจาก API
      code: course.code || course.course_code || "",
      name: course.name || course.course_name_th || course.course_name_en || "",

      // assignment จาก API
      position: role,
      positionLabel,

      // ชั่วโมงที่ใช้ไป / quota / คงเหลือ
      used: Number(course.used ?? course.hour ?? 0),
      quota: Number(course.quota ?? course.max_hour ?? 45),
      remaining: Number(
        course.remaining ??
          course.remaining_hour ??
          Math.max(Number(course.max_hour ?? 45) - Number(course.hour ?? 0), 0),
      ),

      // rate ถ้ามีจาก backend ใช้ได้เลย
      rate: Number(course.rate || 0),
      rateSource:
        course.rateSource ||
        (role ? `ตามข้อมูลการมอบหมาย: ${positionLabel}` : ""),
    };
  };

  const normalizedCourses = courses.map(normalizeCourse).filter(Boolean);

  const firstCourse =
    normalizedCourses.find((c) => c.code === presetCourse) ||
    normalizedCourses[0];

  const [step, setStep] = useState(1);

  const [form, setForm] = useState(() => {
    if (initialClaim) {
      return {
        semester: initialClaim.semester || "1/2569",
        termId: initialClaim.termId || "",
        round: initialClaim.round || "",

        periodId: initialClaim.periodId || "",
        courseCode: initialClaim.courseCode || "",
        courseName: initialClaim.courseName || "",
        rate: Number(initialClaim.rate || 0),
        // คำขอใหม่มี sessions (หลายวัน) ส่วนคำขอเก่ามีแค่วันเดียว + ชั่วโมงทศนิยม
        sessions:
          Array.isArray(initialClaim.sessions) &&
          initialClaim.sessions.length > 0
            ? initialClaim.sessions.map((s) => ({
                ...emptySession(),
                date: s.date || "",
                hours: s.hours ? String(s.hours) : "",
                minutes: s.minutes ? String(s.minutes) : "",
              }))
            : [
                {
                  ...emptySession(),
                  date: /^\d{4}-\d{2}-\d{2}$/.test(
                    initialClaim.teachingDate || "",
                  )
                    ? initialClaim.teachingDate
                    : "",
                  ...hoursToParts(initialClaim.hours),
                },
              ],
        notes: initialClaim.notes || "",
        fileName: initialClaim.evidence || "",
      };
    }

    return {
      semester: "1/2569",

      termId: "",

      round: presetRound
        ? `${presetRound.label || ""} · ${presetRound.period || ""}`
        : rounds[0]
          ? `${rounds[0].label || ""} · ${rounds[0].period || ""}`
          : "",

      periodId: presetRound?.id || "",

      courseCode: presetCourse || firstCourse?.code || "",

      courseName: firstCourse?.name || "",

      rate: Number(firstCourse?.rate || 0),

      sessions: [emptySession()],

      notes: "",

      fileName: "",
    };
  });

  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  const course = normalizedCourses.find((c) => c.code === form.courseCode);

  // อัตรามาจากตำแหน่งในรายวิชาที่ได้รับมอบหมายเท่านั้น (ไม่ใช้ค่าที่อยู่ในฟอร์ม)
  const rate = Number(course?.rate || 0);

  const quota = Number(course?.quota) || 45;

  const used = Number(course?.used) || 0;

  const remaining = Math.max(quota - used, 0);

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  /*
   * คำนวณเวลาสอนรวมและเงินอัตโนมัติ (คิดตามนาทีจริง)
   */
  const totalMinutes = form.sessions.reduce(
    (sum, session) => sum + sessionMinutes(session),
    0,
  );

  const totalHours = totalMinutes / 60;

  const amount = roundMoney(totalHours * rate);

  const filledSessions = form.sessions.filter((session) => session.date);

  const updateSession = (id, key, value) => {
    setForm((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === id ? { ...session, [key]: value } : session,
      ),
    }));
  };

  const addSession = () => {
    setForm((current) =>
      current.sessions.length >= MAX_SESSIONS
        ? current
        : {
            ...current,
            sessions: [...current.sessions, emptySession()],
          },
    );
  };

  const removeSession = (id) => {
    setForm((current) => ({
      ...current,
      sessions:
        current.sessions.length > 1
          ? current.sessions.filter((session) => session.id !== id)
          : current.sessions,
    }));
  };

  /*
   * ข้อมูลที่ส่งออกไปบันทึก
   * เก็บ teachingDate (วันแรก) + hours (ชั่วโมงรวมแบบทศนิยม) ไว้ด้วย
   * เพื่อให้หน้าอื่นและ backend ที่ยังใช้รูปแบบเดิมอ่านได้
   */
  function buildPayload() {
    const sortedDates = filledSessions.map((session) => session.date).sort();

    return {
      ...form,
      rate,
      sessions: form.sessions
        .filter((session) => session.date || session.hours || session.minutes)
        .map(({ date, hours, minutes }) => ({
          date,
          hours: Number(hours || 0),
          minutes: Number(minutes || 0),
        })),
      teachingDate: sortedDates[0] || "",
      hours: roundMoney(totalHours),
      amount: totalMinutes ? String(amount) : "",
    };
  }

  /*
   * preset course
   */
  useEffect(() => {
    if (presetCourse && course) {
      setForm((current) => ({
        ...current,
        courseCode: course.code,
        courseName: course.name || "",
        rate: Number(course.rate || 0),
      }));
    }
  }, [presetCourse, course?.code]);

  function validateStep1() {
    const nextErrors = {};

    if (!form.round) {
      nextErrors.round = "กรุณาเลือกรอบการยื่น";
    }

    if (!form.courseCode) {
      nextErrors.courseCode = "กรุณาระบุรายวิชา";
    } else if (!course) {
      nextErrors.courseCode =
        "รายวิชานี้ไม่ได้อยู่ในรายวิชาที่คุณได้รับมอบหมาย";
    } /*else if (rate <= 0) {
      nextErrors.courseCode =
        "ไม่พบอัตราค่าตอบแทนของตำแหน่งนี้ กรุณาติดต่อเจ้าหน้าที่";
    }*/

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors = {};

    /*
     * ตรวจทีละแถว: วันที่ + เวลาสอน และห้ามวันซ้ำกัน
     * error ของแต่ละแถวเก็บเป็น { [id]: { date, time } }
     */
    const sessionErrors = {};

    form.sessions.forEach((session, index) => {
      let dateError = validateTeachingDate(session.date);

      const isDuplicate =
        session.date &&
        form.sessions.findIndex((other) => other.date === session.date) !==
          index;

      if (!dateError && isDuplicate) {
        dateError = "วันที่ซ้ำกับแถวด้านบน";
      }

      const timeError = validateSessionTime(session);

      if (dateError || timeError) {
        sessionErrors[session.id] = { date: dateError, time: timeError };
      }
    });

    if (Object.keys(sessionErrors).length > 0) {
      nextErrors.sessions = sessionErrors;
    } else if (totalMinutes > remaining * 60) {
      nextErrors.sessionsTotal = `เวลาสอนรวม ${formatDuration(totalMinutes)} เกินชั่วโมงคงเหลือ (${remaining} ชม.)`;
    }

    if (form.notes.length > MAX_NOTES_LENGTH) {
      nextErrors.notes = `รายละเอียดต้องไม่เกิน ${MAX_NOTES_LENGTH} ตัวอักษร`;
    }

    if (!form.courseCode) {
      nextErrors.courseCode = "กรุณาระบุรายวิชา";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function next() {
    if (step === 1 && !validateStep1()) {
      return;
    }

    if (step === 2 && !validateStep2()) {
      return;
    }

    setStep((current) => Math.min(4, current + 1));
  }

  function back() {
    if (step === 1) {
      onCancel?.();
      return;
    }

    setStep((current) => current - 1);
  }

  function handleFile(file) {
    if (!file) return;

    const fileError = validateFile(file);

    setErrors((current) => ({
      ...current,
      file: fileError,
    }));

    if (fileError) return;

    set("fileName", file.name);
  }

  /*
   * ตรวจทุกขั้นอีกรอบก่อนยื่นจริง
   * ถ้ามีข้อผิดพลาด พากลับไปขั้นที่ผิด
   */
  function handleSubmit() {
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    if (!validateStep2()) {
      setStep(2);
      return;
    }

    onSubmit?.(buildPayload());
  }

  return (
    <div className="w-full max-w-none">
      {/* Steps */}
      <div className="flex items-center justify-between gap-3 mb-8 w-full">
        {STEP_TITLES.map((title, index) => (
          <React.Fragment key={title}>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                style={{
                  background:
                    step === index + 1
                      ? C.teal
                      : step > index + 1
                        ? C.tealSoft
                        : "#EEF2F5",

                  color:
                    step === index + 1
                      ? "#fff"
                      : step > index + 1
                        ? C.tealDark
                        : C.sub,
                }}
              >
                {step > index + 1 ? <CheckCircle2 size={14} /> : index + 1}
              </div>

              <span
                className="text-sm font-semibold whitespace-nowrap hidden sm:inline"
                style={{
                  color: step >= index + 1 ? C.ink : C.sub,
                }}
              >
                {title}
              </span>
            </div>

            {index < 3 && (
              <div
                className="flex-1 h-[2px] min-w-6"
                style={{
                  background: C.border,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <SectionCard className="overflow-hidden">
        <div
          className="h-16"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealSoft})`,
          }}
        />

        <div className="p-6 md:p-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                className="text-lg font-extrabold"
                style={{
                  color: C.ink,
                }}
              >
                {STEP_TITLES[step - 1]}
              </h2>

              <p
                className="text-xs mt-0.5"
                style={{
                  color: C.sub,
                }}
              >
                {isEditing
                  ? "กำลังแก้ไขคำขอ — บันทึกร่างหรือยื่นใหม่ได้"
                  : "ข้อมูลจะถูกบันทึกไว้ในเครื่องนี้"}
              </p>
            </div>

            {/* ตำแหน่งของผู้ใช้ที่ล็อกอิน (เดิม fix เป็น "อาจารย์") */}
            {user?.role && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: C.tealSoft,
                  color: C.tealDark,
                }}
              >
                {user.role}
              </span>
            )}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="ภาคการศึกษา" required>
                <Select
                  className="fld"
                  value={selectedTermId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const termId = value ? Number(value) : null;

                    const selectedTerm = terms.find(
                      (term) => Number(term.id) === termId,
                    );

                    setForm((current) => ({
                      ...current,

                      termId: termId ?? "",
                      semester: selectedTerm
                        ? `${selectedTerm.semester}/${selectedTerm.year}`
                        : "",

                      // เปลี่ยนภาคแล้วต้องเลือกรอบใหม่
                      periodId: "",
                      round: "",

                      // เปลี่ยนภาคแล้วต้องเลือกรายวิชาใหม่
                      courseCode: "",
                      courseName: "",
                      rate: 0,
                    }));

                    onTermChange?.(termId);
                    onPeriodChange?.(null);
                  }}
                  disabled={termLoading}
                >
                  <option value="">
                    {termLoading
                      ? "กำลังโหลดภาคการศึกษา..."
                      : "เลือกภาคการศึกษา"}
                  </option>

                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.semester}/{term.year}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="รอบการยื่น" required error={errors.round}>
                <Select
                  className="fld"
                  value={selectedPeriodId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const periodId = value ? Number(value) : null;

                    const selectedPeriod = periods.find(
                      (period) => Number(period.id) === periodId,
                    );

                    setForm((current) => ({
                      ...current,

                      periodId: periodId ?? "",
                      round: selectedPeriod
                        ? selectedPeriod.label ||
                          `${selectedPeriod.month}/${selectedPeriod.year || ""}`
                        : "",
                    }));

                    onPeriodChange?.(periodId);
                  }}
                  disabled={!selectedTermId || periodLoading}
                >
                  <option value="">
                    {!selectedTermId
                      ? "เลือกภาคการศึกษาก่อน"
                      : periodLoading
                        ? "กำลังโหลดรอบการยื่น..."
                        : periods.length === 0
                          ? "ไม่มีรอบการยื่น"
                          : "เลือกรอบการยื่น"}
                  </option>

                  {periods.map((period) => {
                    const formatDate = (dateString) => {
                      if (!dateString) return "";

                      return new Intl.DateTimeFormat("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(dateString));
                    };

                    return (
                      <option key={period.id} value={period.id}>
                        เดือน {period.month} : {formatDate(period.open_at)} –{" "}
                        {formatDate(period.close_at)}
                      </option>
                    );
                  })}
                </Select>
                {termError && (
                  <p className="text-xs mt-1.5" style={{ color: C.rose }}>
                    {termError}
                  </p>
                )}
              </Field>

              <Field label="รายวิชา" required error={errors.courseCode}>
                {courseLoading ? (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: "#F8FBFC",
                      color: C.sub,
                    }}
                  >
                    กำลังโหลดรายวิชาที่ได้รับมอบหมาย...
                  </div>
                ) : courseError ? (
                  <div
                    className="flex items-start gap-2 text-sm rounded-xl px-4 py-3"
                    style={{
                      background: "#FCE9EA",
                      color: C.rose,
                    }}
                  >
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{courseError}</span>
                  </div>
                ) : normalizedCourses.length > 0 ? (
                  <Select
                    className="fld"
                    value={form.courseCode}
                    onChange={(e) => {
                      const selected = normalizedCourses.find(
                        (item) => item.code === e.target.value,
                      );

                      setForm((current) => ({
                        ...current,
                        courseCode: e.target.value,
                        courseName: selected?.name || "",
                        rate: Number(selected?.rate || 0),
                      }));
                    }}
                  >
                    <option value="">เลือกรายวิชา</option>

                    {normalizedCourses.map((item) => (
                      <option
                        key={`${item.code}-${item.section_no ?? ""}`}
                        value={item.code}
                      >
                        {item.code} – {item.name || "ไม่ระบุชื่อ"}
                        {item.section_no ? ` (${item.section_no})` : ""}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div
                    className="flex items-start gap-2 text-sm rounded-xl px-4 py-3"
                    style={{ background: "#FEF6D8", color: "#9A7B06" }}
                  >
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>
                      ยังไม่มีรายวิชาที่ได้รับมอบหมาย จึงยื่นคำขอเบิกไม่ได้
                      หากข้อมูลไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่
                    </span>
                  </div>
                )}
              </Field>

              {/* ตำแหน่งและอัตรามาจากการมอบหมายงาน ผู้ใช้แก้เองไม่ได้ */}
              {course && (
                <div
                  className="rounded-2xl px-4 py-3 text-sm"
                  style={{ background: C.tealSoft }}
                >
                  <p style={{ color: C.ink }}>
                    ตำแหน่งในวิชานี้:{" "}
                    <span className="font-semibold">
                      {course.positionLabel}
                    </span>
                    {course.section_no && (
                      <>
                        {" · "}
                        Section{" "}
                        <span className="font-semibold">
                          {course.section_no}
                        </span>
                      </>
                    )}
                  </p>

                  <p className="text-xs mt-1" style={{ color: C.sub }}>
                    ชั่วโมงที่ใช้ไป {course.used} / {course.quota} ชม.
                    {" · "}
                    คงเหลือ {course.remaining} ชม.
                  </p>

                  {course.rate > 0 ? (
                    <p className="text-xs mt-1" style={{ color: C.sub }}>
                      อัตรา ฿{rate.toLocaleString()} / ชั่วโมง
                      {" · "}
                      {course.rateSource}
                    </p>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: C.sub }}>
                      อัตราค่าตอบแทนจะอ้างอิงจากข้อมูลการมอบหมายงาน
                    </p>
                  )}
                </div>
              )}

              {course && (
                <p
                  className="text-xs"
                  style={{
                    color: C.sub,
                  }}
                >
                  ชั่วโมงคงเหลือ:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: C.tealDark,
                    }}
                  >
                    {remaining} ชม.
                  </span>
                </p>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              {/* วันและเวลาที่สอน — เพิ่มได้หลายวันในคำขอเดียว */}
              <div>
                <div
                  className="flex items-center gap-1 text-sm font-semibold mb-2"
                  style={{ color: C.ink }}
                >
                  <span>วันและเวลาที่สอน</span>
                  <span style={{ color: C.rose }}>*</span>
                </div>

                <div className="flex flex-col gap-3">
                  {form.sessions.map((session, index) => {
                    const rowError = errors.sessions?.[session.id];

                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl border p-3"
                        style={{
                          borderColor: rowError ? C.rose : C.border,
                          background: "#FAFDFE",
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: C.tealSoft,
                              color: C.tealDark,
                            }}
                          >
                            {index + 1}
                          </span>

                          <input
                            type="date"
                            aria-label={`วันที่สอน วันที่ ${index + 1}`}
                            className="fld flex-1 min-w-[10rem]"
                            min={SEMESTER_START}
                            max={todayISO()}
                            value={session.date}
                            onChange={(e) =>
                              updateSession(session.id, "date", e.target.value)
                            }
                          />

                          {/* พิมพ์เองได้ หรือกดเลือกจากรายการ (ชม. 0–12, นาทีทีละ 5 แต่พิมพ์ 0–59 ได้ทุกเลข) */}
                          <div className="flex items-center gap-2">
                            <NumberCombo
                              ariaLabel="ชั่วโมง"
                              value={session.hours}
                              max={MAX_HOURS_PER_DAY}
                              options={HOUR_OPTIONS}
                              onChange={(value) =>
                                updateSession(session.id, "hours", value)
                              }
                            />
                            <span className="text-sm" style={{ color: C.sub }}>
                              ชม.
                            </span>

                            <NumberCombo
                              ariaLabel="นาที"
                              value={session.minutes}
                              max={59}
                              options={MINUTE_OPTIONS}
                              onChange={(value) =>
                                updateSession(session.id, "minutes", value)
                              }
                            />
                            <span className="text-sm" style={{ color: C.sub }}>
                              นาที
                            </span>
                          </div>

                          {form.sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSession(session.id)}
                              aria-label={`ลบวันที่ ${index + 1}`}
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:bg-[#FCE9EA] transition-colors ml-auto"
                            >
                              <Trash2 size={16} style={{ color: C.rose }} />
                            </button>
                          )}
                        </div>

                        {rowError && (
                          <p
                            className="text-xs mt-2 pl-9"
                            style={{ color: C.rose }}
                          >
                            {[rowError.date, rowError.time]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <button
                    type="button"
                    onClick={addSession}
                    disabled={form.sessions.length >= MAX_SESSIONS}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border disabled:opacity-50 hover:bg-[#E8F0FA] transition-colors"
                    style={{ borderColor: C.teal, color: C.tealDark }}
                  >
                    <Plus size={15} />
                    เพิ่มวันสอน
                  </button>

                  <span className="text-sm" style={{ color: C.sub }}>
                    รวม {filledSessions.length} วัน ·{" "}
                    <span className="font-semibold" style={{ color: C.ink }}>
                      {formatDuration(totalMinutes)}
                    </span>{" "}
                    (คงเหลือ {remaining} ชม.)
                  </span>
                </div>

                {errors.sessionsTotal && (
                  <p className="text-xs mt-2" style={{ color: C.rose }}>
                    {errors.sessionsTotal}
                  </p>
                )}
              </div>

              <Field label="อัตราค่าตอบแทน">
                <div
                  className="fld bg-[#F8FBFC]"
                  style={{
                    color: C.ink,
                  }}
                >
                  ฿{rate.toLocaleString()}
                  {" / ชั่วโมง"}
                </div>

                {course && (
                  <p className="text-xs mt-1.5" style={{ color: C.sub }}>
                    ตามตำแหน่ง {course.positionLabel} · {course.rateSource}
                  </p>
                )}
              </Field>

              <Field label="จำนวนเงิน">
                <div className="relative">
                  <Wallet
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{
                      color: C.sub,
                    }}
                  />

                  {/* ใช้ style แทน pl-10 เพราะ .fld ใน index.css ทับ padding ของ Tailwind ทำให้ไอคอนซ้อนตัวเลข */}
                  <input
                    readOnly
                    className="fld bg-[#F8FBFC]"
                    style={{ paddingLeft: "2.75rem" }}
                    value={totalMinutes ? amount.toLocaleString() : ""}
                    placeholder="คำนวณอัตโนมัติ"
                  />
                </div>

                {totalMinutes > 0 && (
                  <p className="text-xs mt-1.5" style={{ color: C.sub }}>
                    {formatDuration(totalMinutes)} × ฿{rate.toLocaleString()}
                    /ชม. (คิดตามนาทีจริง)
                  </p>
                )}
              </Field>

              <Field label="รายละเอียดเพิ่มเติม (ถ้ามี)" error={errors.notes}>
                <textarea
                  rows={3}
                  maxLength={MAX_NOTES_LENGTH}
                  className="fld resize-none"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
                <p className="text-xs text-right mt-1" style={{ color: C.sub }}>
                  {form.notes.length}/{MAX_NOTES_LENGTH}
                </p>
              </Field>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <p
                className="text-sm font-semibold mb-3"
                style={{
                  color: C.ink,
                }}
              >
                อัปโหลดไฟล์
              </p>

              <div
                className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-12 px-6 text-center"
                style={{
                  borderColor: C.border,
                  background: "#FAFDFE",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();

                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: C.tealSoft,
                  }}
                >
                  <UploadCloud
                    size={24}
                    style={{
                      color: C.tealDark,
                    }}
                  />
                </div>

                <p
                  className="font-semibold mb-1"
                  style={{
                    color: C.ink,
                  }}
                >
                  เลือกไฟล์ หรือลากมาวางที่นี่
                </p>

                <p
                  className="text-xs mb-4"
                  style={{
                    color: C.sub,
                  }}
                >
                  PDF, JPG, PNG ไม่เกิน {MAX_FILE_MB} MB ·
                  เวอร์ชันนี้จัดเก็บเฉพาะชื่อไฟล์ใน localStorage
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                  hidden
                  onChange={(e) => handleFile(e.target.files[0])}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 rounded-full text-sm font-semibold border"
                  style={{
                    borderColor: C.teal,
                    color: C.tealDark,
                  }}
                >
                  เลือกไฟล์
                </button>
              </div>

              {errors.file && (
                <p
                  className="text-xs mt-2 flex items-center gap-1.5"
                  style={{ color: C.rose }}
                >
                  <AlertTriangle size={13} />
                  {errors.file}
                </p>
              )}

              {form.fileName && (
                <div
                  className="mt-4 flex items-center justify-between rounded-2xl border px-5 py-3.5"
                  style={{
                    borderColor: C.border,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      size={18}
                      style={{
                        color: C.tealDark,
                      }}
                    />

                    <p
                      className="text-sm font-medium"
                      style={{
                        color: C.ink,
                      }}
                    >
                      {form.fileName}
                    </p>
                  </div>

                  <button type="button" onClick={() => set("fileName", "")}>
                    <Trash2
                      size={16}
                      style={{
                        color: C.sub,
                      }}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <SummaryRow
                label="รายวิชา"
                value={`${form.courseCode || "-"} — ${form.courseName || "-"}`}
              />

              <SummaryRow
                label="ภาคการศึกษา / รอบ"
                value={`${form.semester} · ${form.round || "-"}`}
              />

              <SummaryRow
                label={`วันที่สอน (${filledSessions.length} วัน)`}
                value={
                  filledSessions.length > 0 ? (
                    <span className="flex flex-col gap-0.5">
                      {[...filledSessions]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((session) => (
                          <span key={session.id}>
                            {formatThaiDate(session.date)} ·{" "}
                            {formatDuration(sessionMinutes(session))}
                          </span>
                        ))}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />

              <SummaryRow
                label="เวลาสอนรวม"
                value={formatDuration(totalMinutes)}
              />

              <SummaryRow
                label="อัตราค่าตอบแทน"
                value={`฿${rate.toLocaleString()} / ชั่วโมง`}
              />

              <SummaryRow
                label="จำนวนเงิน"
                value={`฿${amount.toLocaleString()}`}
              />

              <SummaryRow
                label="รายละเอียดเพิ่มเติม"
                value={form.notes || "—"}
              />

              <SummaryRow
                label="หลักฐานแนบ"
                value={form.fileName || "ไม่มีไฟล์แนบ"}
              />

              {!form.fileName && (
                <div
                  className="flex items-start gap-2 text-xs rounded-xl px-4 py-3"
                  style={{
                    background: "#FEF6D8",
                    color: "#9A7B06",
                  }}
                >
                  <AlertTriangle size={15} />

                  <span>ยังไม่ได้แนบหลักฐาน สามารถยื่นคำขอได้</span>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between mt-10">
            <button
              type="button"
              onClick={back}
              className="px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{
                background: "#EEF2F5",
                color: C.ink,
              }}
            >
              ย้อนกลับ
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSaveDraft?.(buildPayload())}
                // ไม่มีวิชาที่ได้รับมอบหมาย = บันทึกร่างไม่ได้เช่นกัน
                disabled={normalizedCourses.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: C.border,
                  color: C.tealDark,
                }}
              >
                <Save size={14} />
                บันทึกร่าง
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  className="px-7 py-2.5 rounded-full text-sm font-semibold text-white flex items-center gap-2"
                  style={{
                    background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
                  }}
                >
                  ถัดไป
                  <ArrowRight size={15} />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border"
                    style={{
                      borderColor: C.border,
                      color: C.ink,
                    }}
                  >
                    <Pencil size={14} />
                    แก้ไข
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
                    }}
                  >
                    <Send size={14} />
                    {isEditing ? "ยื่นคำขออีกครั้ง" : "ยื่นคำขอ"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
