import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight, UploadCloud, FileText, Trash2, CheckCircle2, AlertTriangle,
  Calendar, Wallet, Pencil, Send,
} from "lucide-react";
import { C } from "../theme";
import { COURSES, courseByCode } from "../data/mockData";
import SectionCard from "../components/SectionCard";
import Field from "../components/Field";
import SummaryRow from "../components/SummaryRow";

const STEP_TITLES = ["ข้อมูล", "รายละเอียดคำขอ", "หลักฐานประกอบการเบิก", "ตรวจสอบความถูกต้อง"];

export default function CreateClaim({ presetCourse, onCancel, onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    semester: "1/2569",
    round: "รอบที่ 2 · 1 – 31 สิงหาคม 2569",
    courseCode: presetCourse || "CS101",
    teachingDate: "",
    hours: "",
    amount: "",
    notes: "",
    fileName: "",
  });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const course = courseByCode(form.courseCode);
  const remaining = course.quota - course.used;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (form.hours && course.rate) {
      const calc = Number(form.hours) * course.rate;
      set("amount", isNaN(calc) ? "" : String(calc));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hours, form.courseCode]);

  function validateStep2() {
    const e = {};
    if (!form.teachingDate) e.teachingDate = "กรุณาระบุวันที่สอน";
    if (!form.hours || Number(form.hours) <= 0) e.hours = "กรุณาระบุจำนวนชั่วโมง";
    else if (Number(form.hours) > remaining) e.hours = `เกินชั่วโมงคงเหลือ (${remaining} ชม.)`;
    if (!form.amount || Number(form.amount) <= 0) e.amount = "กรุณาระบุจำนวนเงิน";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    if (step === 1) onCancel();
    else setStep((s) => s - 1);
  }

  function handleFile(file) {
    if (!file) return;
    setUploading(true);
    set("fileName", file.name);
    setTimeout(() => setUploading(false), 500);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STEP_TITLES.map((t, i) => (
          <React.Fragment key={t}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: step === i + 1 ? C.teal : step > i + 1 ? C.tealSoft : "#EEF2F5",
                  color: step === i + 1 ? "#fff" : step > i + 1 ? C.tealDark : C.sub,
                }}
              >
                {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: step >= i + 1 ? C.ink : C.sub }}>{t}</span>
            </div>
            {i < STEP_TITLES.length - 1 && <div className="w-6 h-[2px]" style={{ background: C.border }} />}
          </React.Fragment>
        ))}
      </div>

      <SectionCard className="overflow-hidden">
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${C.teal}, #B9E5EC)` }} />
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: C.ink }}>{STEP_TITLES[step - 1]}</h2>
              <p className="text-xs mt-0.5" style={{ color: C.sub }}>Username@gmail.com</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: C.tealSoft, color: C.tealDark }}>อาจารย์</span>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <Field label="ภาคการศึกษา" required>
                <select className="fld" value={form.semester} onChange={(e) => set("semester", e.target.value)}>
                  <option>1/2569</option>
                  <option>2/2569</option>
                </select>
              </Field>
              <Field label="รอบการยื่น" required>
                <select className="fld" value={form.round} onChange={(e) => set("round", e.target.value)}>
                  <option>รอบที่ 2 · 1 – 31 สิงหาคม 2569</option>
                  <option>รอบที่ 1 · 1 – 31 กรกฎาคม 2569</option>
                </select>
              </Field>
              <Field label="รายวิชา" required>
                <select className="fld" value={form.courseCode} onChange={(e) => set("courseCode", e.target.value)}>
                  {COURSES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} – {c.name}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs" style={{ color: C.sub }}>
                ชั่วโมงคงเหลือสำหรับวิชานี้: <span className="font-semibold" style={{ color: C.tealDark }}>{remaining} ชม.</span> จากทั้งหมด {course.quota} ชม.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Field label="วันที่สอน" required error={errors.teachingDate}>
                <div className="relative">
                  <input type="date" className="fld" value={form.teachingDate} onChange={(e) => set("teachingDate", e.target.value)} />
                  <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.sub }} />
                </div>
              </Field>
              <Field label="จำนวนชั่วโมง" required error={errors.hours}>
                <input type="number" min="0" step="0.5" placeholder="กรอกตัวเลข" className="fld" value={form.hours} onChange={(e) => set("hours", e.target.value)} />
              </Field>
              <Field label="จำนวนเงิน" required error={errors.amount}>
                <div className="relative">
                  <Wallet size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: C.sub }} />
                  <input type="number" min="0" placeholder="คำนวณอัตโนมัติจากจำนวนชั่วโมง" className="fld pl-10" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
                </div>
              </Field>
              <Field label="รายละเอียดเพิ่มเติม (ถ้ามี)">
                <textarea rows={3} placeholder="กรอกรายละเอียด" className="fld resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: C.ink }}>อัปโหลดไฟล์</p>
              <div
                className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-12 px-6 text-center"
                style={{ borderColor: "#BFE3EA", background: "#FAFDFE" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: C.tealSoft }}>
                  <UploadCloud size={24} style={{ color: C.tealDark }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: C.ink }}>เลือกไฟล์ หรือลากมาวางที่นี่</p>
                <p className="text-xs mb-4" style={{ color: C.sub }}>รองรับไฟล์ JPEG, PNG, PDF และ MP4 ขนาดไม่เกิน 50MB</p>
                <input ref={fileInputRef} type="file" hidden onChange={(e) => handleFile(e.target.files[0])} />
                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 rounded-full text-sm font-semibold border" style={{ borderColor: C.teal, color: C.tealDark }}>
                  เลือกไฟล์
                </button>
              </div>

              {form.fileName && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border px-5 py-3.5" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-3">
                    <FileText size={18} style={{ color: C.tealDark }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.ink }}>{form.fileName}</p>
                      <p className="text-xs" style={{ color: C.sub }}>{uploading ? "กำลังอัปโหลด…" : "อัปโหลดสำเร็จ"}</p>
                    </div>
                  </div>
                  <button onClick={() => set("fileName", "")}>
                    <Trash2 size={16} style={{ color: C.sub }} />
                  </button>
                </div>
              )}

              <p className="text-xs mt-5" style={{ color: C.sub }}>
                * หากส่งหลักฐานหลังวันครบกำหนด คำขอยังสามารถยื่นได้ แต่อาจได้รับเงินล่าช้า
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <SummaryRow label="รายวิชา" value={`${form.courseCode} — ${course.name}`} />
              <SummaryRow label="ภาคการศึกษา / รอบ" value={`${form.semester} · ${form.round.split("·")[0].trim()}`} />
              <SummaryRow label="วันที่สอน" value={form.teachingDate || "—"} />
              <SummaryRow label="จำนวนชั่วโมง" value={`${form.hours || 0} ชั่วโมง`} />
              <SummaryRow label="จำนวนเงิน" value={`฿${Number(form.amount || 0).toLocaleString()}`} />
              <SummaryRow label="รายละเอียดเพิ่มเติม" value={form.notes || "—"} />
              <SummaryRow label="หลักฐานแนบ" value={form.fileName || "ไม่มีไฟล์แนบ"} />
              {!form.fileName && (
                <div className="flex items-start gap-2 text-xs rounded-xl px-4 py-3" style={{ background: "#FEF6D8", color: "#9A7B06" }}>
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  ยังไม่ได้แนบหลักฐาน คำขอสามารถยื่นได้แต่แนะนำให้แนบไฟล์เพื่อการตรวจสอบที่รวดเร็วขึ้น
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-10">
            <button onClick={back} className="px-6 py-2.5 rounded-full text-sm font-semibold" style={{ background: "#EEF2F5", color: C.ink }}>
              ย้อนกลับ
            </button>
            {step < 4 ? (
              <button onClick={next} className="px-7 py-2.5 rounded-full text-sm font-semibold text-white flex items-center gap-2" style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}>
                ถัดไป <ArrowRight size={15} />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border" style={{ borderColor: C.border, color: C.ink }}>
                  <Pencil size={14} /> แก้ไข
                </button>
                <button onClick={() => onSubmit(form)} className="flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}>
                  <Send size={14} /> ยื่นคำขอ
                </button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
