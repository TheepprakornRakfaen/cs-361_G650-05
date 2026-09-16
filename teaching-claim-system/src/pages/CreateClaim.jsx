import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Wallet,
  Pencil,
  Send,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import Field from "../components/Field";
import SummaryRow from "../components/SummaryRow";

const STEP_TITLES = [
  "ข้อมูล",
  "รายละเอียดคำขอ",
  "หลักฐานประกอบการเบิก",
  "ตรวจสอบความถูกต้อง",
];

export default function CreateClaim({
  presetCourse,
  presetRound,
  courses = [],
  rounds = [],
  onCancel,
  onSubmit,
}) {
  const firstCourse =
    courses.find(
      (c) =>
        c.code ===
        presetCourse
    ) ||
    courses[0];

  const [step, setStep] =
    useState(1);

  const [form, setForm] =
    useState({
      semester: "1/2569",

      round: presetRound
        ? `${presetRound.label || ""} · ${
            presetRound.period || ""
          }`
        : rounds[0]
        ? `${rounds[0].label || ""} · ${
            rounds[0].period || ""
          }`
        : "",

      courseCode:
        presetCourse ||
        firstCourse?.code ||
        "",

      courseName:
        firstCourse?.name ||
        "",

      rate:
        Number(
          firstCourse?.rate || 0
        ),

      teachingDate: "",

      hours: "",

      amount: "",

      notes: "",

      fileName: "",
    });

  const [errors, setErrors] =
    useState({});

  const fileInputRef =
    useRef(null);

  const course =
    courses.find(
      (c) =>
        c.code ===
        form.courseCode
    );

  const rate = Number(
    course?.rate ??
      form.rate ??
      0
  );

  const quota =
    Number(
      course?.quota
    ) || 45;

  const used =
    Number(
      course?.used
    ) || 0;

  const remaining =
    Math.max(
      quota - used,
      0
    );

  const set = (
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  /*
   * คำนวณเงินอัตโนมัติ
   */
  useEffect(() => {
    const hours =
      Number(
        form.hours || 0
      );

    const amount =
      hours * rate;

    setForm((current) => ({
      ...current,
      amount:
        form.hours
          ? String(amount)
          : "",
      rate,
    }));
  }, [
    form.hours,
    rate,
  ]);

  /*
   * preset course
   */
  useEffect(() => {
    if (
      presetCourse &&
      course
    ) {
      setForm(
        (current) => ({
          ...current,
          courseCode:
            course.code,
          courseName:
            course.name || "",
          rate: Number(
            course.rate || 0
          ),
        })
      );
    }
  }, [
    presetCourse,
    course?.code,
  ]);

  function validateStep2() {
    const nextErrors = {};

    if (
      !form.teachingDate
    ) {
      nextErrors.teachingDate =
        "กรุณาระบุวันที่สอน";
    }

    if (
      !form.hours ||
      Number(form.hours) <=
        0
    ) {
      nextErrors.hours =
        "กรุณาระบุจำนวนชั่วโมง";
    } else if (
      Number(form.hours) >
      remaining
    ) {
      nextErrors.hours =
        `เกินชั่วโมงคงเหลือ (${remaining} ชม.)`;
    }

    if (!form.courseCode) {
      nextErrors.courseCode =
        "กรุณาระบุรายวิชา";
    }

    setErrors(
      nextErrors
    );

    return (
      Object.keys(
        nextErrors
      ).length === 0
    );
  }

  function next() {
    if (
      step === 2 &&
      !validateStep2()
    ) {
      return;
    }

    setStep((current) =>
      Math.min(
        4,
        current + 1
      )
    );
  }

  function back() {
    if (step === 1) {
      onCancel?.();
      return;
    }

    setStep((current) =>
      current - 1
    );
  }

  function handleFile(
    file
  ) {
    if (!file) return;

    set(
      "fileName",
      file.name
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Steps */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STEP_TITLES.map(
          (
            title,
            index
          ) => (
            <React.Fragment
              key={title}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background:
                      step ===
                      index + 1
                        ? C.teal
                        : step >
                          index + 1
                        ? C.tealSoft
                        : "#EEF2F5",

                    color:
                      step ===
                      index + 1
                        ? "#fff"
                        : step >
                          index + 1
                        ? C.tealDark
                        : C.sub,
                  }}
                >
                  {step >
                  index + 1 ? (
                    <CheckCircle2
                      size={14}
                    />
                  ) : (
                    index + 1
                  )}
                </div>

                <span
                  className="text-xs font-medium hidden sm:inline"
                  style={{
                    color:
                      step >=
                      index + 1
                        ? C.ink
                        : C.sub,
                  }}
                >
                  {title}
                </span>
              </div>

              {index <
                3 && (
                <div
                  className="w-6 h-[2px]"
                  style={{
                    background:
                      C.border,
                  }}
                />
              )}
            </React.Fragment>
          )
        )}
      </div>

      <SectionCard className="overflow-hidden">
        <div
          className="h-2"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealSoft})`,
          }}
        />

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                className="text-lg font-extrabold"
                style={{
                  color: C.ink,
                }}
              >
                {
                  STEP_TITLES[
                    step - 1
                  ]
                }
              </h2>

              <p
                className="text-xs mt-0.5"
                style={{
                  color: C.sub,
                }}
              >
                ข้อมูลจะถูกบันทึกไว้ในเครื่องนี้
              </p>
            </div>

            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                background:
                  C.tealSoft,
                color:
                  C.tealDark,
              }}
            >
              อาจารย์
            </span>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <Field
                label="ภาคการศึกษา"
                required
              >
                <select
                  className="fld"
                  value={
                    form.semester
                  }
                  onChange={(e) =>
                    set(
                      "semester",
                      e.target
                        .value
                    )
                  }
                >
                  <option>
                    1/2569
                  </option>

                  <option>
                    2/2569
                  </option>
                </select>
              </Field>

              <Field
                label="รอบการยื่น"
                required
              >
                <select
                  className="fld"
                  value={
                    form.round
                  }
                  onChange={(e) =>
                    set(
                      "round",
                      e.target
                        .value
                    )
                  }
                >
                  <option value="">
                    เลือกรอบการยื่น
                  </option>

                  {rounds.map(
                    (round) => (
                      <option
                        key={
                          round.id
                        }
                        value={`${round.label || ""} · ${
                          round.period ||
                          ""
                        }`}
                      >
                        {round.label}

                        {round.period
                          ? ` · ${round.period}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="รายวิชา"
                required
                error={
                  errors.courseCode
                }
              >
                {courses.length >
                0 ? (
                  <select
                    className="fld"
                    value={
                      form.courseCode
                    }
                    onChange={(e) => {
                      const selected =
                        courses.find(
                          (item) =>
                            item.code ===
                            e.target
                              .value
                        );

                      setForm(
                        (
                          current
                        ) => ({
                          ...current,

                          courseCode:
                            e.target
                              .value,

                          courseName:
                            selected?.name ||
                            "",

                          rate: Number(
                            selected?.rate ||
                              0
                          ),
                        })
                      );
                    }}
                  >
                    <option value="">
                      เลือกรายวิชา
                    </option>

                    {courses.map(
                      (item) => (
                        <option
                          key={
                            item.code
                          }
                          value={
                            item.code
                          }
                        >
                          {
                            item.code
                          }{" "}
                          –{" "}
                          {item.name ||
                            "ไม่ระบุชื่อ"}
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      className="fld"
                      value={
                        form.courseCode
                      }
                      placeholder="รหัสรายวิชา เช่น CS101"
                      onChange={(e) =>
                        set(
                          "courseCode",
                          e.target
                            .value
                        )
                      }
                    />

                    <input
                      className="fld"
                      value={
                        form.courseName
                      }
                      placeholder="ชื่อรายวิชา"
                      onChange={(e) =>
                        set(
                          "courseName",
                          e.target
                            .value
                        )
                      }
                    />
                  </div>
                )}
              </Field>

              {courses.length ===
                0 && (
                <Field
                  label="อัตราค่าตอบแทนต่อชั่วโมง"
                  required
                >
                  <input
                    type="number"
                    min="0"
                    className="fld"
                    value={
                      form.rate ||
                      ""
                    }
                    placeholder="เช่น 600"
                    onChange={(e) =>
                      set(
                        "rate",
                        e.target
                          .value
                      )
                    }
                  />
                </Field>
              )}

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
                    color:
                      C.tealDark,
                  }}
                >
                  {remaining} ชม.
                </span>
              </p>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <Field
                label="วันที่สอน"
                required
                error={
                  errors.teachingDate
                }
              >
                <div className="relative">
                  <input
                    type="date"
                    className="fld"
                    value={
                      form.teachingDate
                    }
                    onChange={(e) =>
                      set(
                        "teachingDate",
                        e.target
                          .value
                      )
                    }
                  />

                  <Calendar
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      color:
                        C.sub,
                    }}
                  />
                </div>
              </Field>

              <Field
                label="จำนวนชั่วโมง"
                required
                error={
                  errors.hours
                }
              >
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="fld"
                  placeholder="กรอกจำนวนชั่วโมง"
                  value={
                    form.hours
                  }
                  onChange={(e) =>
                    set(
                      "hours",
                      e.target
                        .value
                    )
                  }
                />
              </Field>

              <Field label="อัตราค่าตอบแทน">
                <div
                  className="fld bg-[#F8FBFC]"
                  style={{
                    color: C.ink,
                  }}
                >
                  ฿
                  {rate.toLocaleString()}
                  {" / ชั่วโมง"}
                </div>
              </Field>

              <Field label="จำนวนเงิน">
                <div className="relative">
                  <Wallet
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{
                      color:
                        C.sub,
                    }}
                  />

                  <input
                    readOnly
                    className="fld pl-10 bg-[#F8FBFC]"
                    value={
                      form.amount
                        ? Number(
                            form.amount
                          ).toLocaleString()
                        : ""
                    }
                    placeholder="คำนวณอัตโนมัติ"
                  />
                </div>
              </Field>

              <Field label="รายละเอียดเพิ่มเติม (ถ้ามี)">
                <textarea
                  rows={3}
                  className="fld resize-none"
                  value={
                    form.notes
                  }
                  onChange={(e) =>
                    set(
                      "notes",
                      e.target
                        .value
                    )
                  }
                />
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
                  borderColor:
                    C.border,
                  background:
                    "#FAFDFE",
                }}
                onDragOver={(e) =>
                  e.preventDefault()
                }
                onDrop={(e) => {
                  e.preventDefault();

                  handleFile(
                    e.dataTransfer
                      .files[0]
                  );
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background:
                      C.tealSoft,
                  }}
                >
                  <UploadCloud
                    size={24}
                    style={{
                      color:
                        C.tealDark,
                    }}
                  />
                </div>

                <p
                  className="font-semibold mb-1"
                  style={{
                    color: C.ink,
                  }}
                >
                  เลือกไฟล์
                  หรือลากมาวางที่นี่
                </p>

                <p
                  className="text-xs mb-4"
                  style={{
                    color: C.sub,
                  }}
                >
                  เวอร์ชันนี้จัดเก็บเฉพาะชื่อไฟล์ใน localStorage
                </p>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  hidden
                  onChange={(e) =>
                    handleFile(
                      e.target
                        .files[0]
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="px-5 py-2 rounded-full text-sm font-semibold border"
                  style={{
                    borderColor:
                      C.teal,
                    color:
                      C.tealDark,
                  }}
                >
                  เลือกไฟล์
                </button>
              </div>

              {form.fileName && (
                <div
                  className="mt-4 flex items-center justify-between rounded-2xl border px-5 py-3.5"
                  style={{
                    borderColor:
                      C.border,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      size={18}
                      style={{
                        color:
                          C.tealDark,
                      }}
                    />

                    <p
                      className="text-sm font-medium"
                      style={{
                        color:
                          C.ink,
                      }}
                    >
                      {
                        form.fileName
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "fileName",
                        ""
                      )
                    }
                  >
                    <Trash2
                      size={16}
                      style={{
                        color:
                          C.sub,
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
                value={`${form.courseCode || "-"} — ${
                  form.courseName ||
                  "-"
                }`}
              />

              <SummaryRow
                label="ภาคการศึกษา / รอบ"
                value={`${form.semester} · ${
                  form.round ||
                  "-"
                }`}
              />

              <SummaryRow
                label="วันที่สอน"
                value={
                  form.teachingDate ||
                  "—"
                }
              />

              <SummaryRow
                label="จำนวนชั่วโมง"
                value={`${form.hours || 0} ชั่วโมง`}
              />

              <SummaryRow
                label="อัตราค่าตอบแทน"
                value={`฿${rate.toLocaleString()} / ชั่วโมง`}
              />

              <SummaryRow
                label="จำนวนเงิน"
                value={`฿${Number(
                  form.amount ||
                    0
                ).toLocaleString()}`}
              />

              <SummaryRow
                label="รายละเอียดเพิ่มเติม"
                value={
                  form.notes ||
                  "—"
                }
              />

              <SummaryRow
                label="หลักฐานแนบ"
                value={
                  form.fileName ||
                  "ไม่มีไฟล์แนบ"
                }
              />

              {!form.fileName && (
                <div
                  className="flex items-start gap-2 text-xs rounded-xl px-4 py-3"
                  style={{
                    background:
                      "#FEF6D8",
                    color:
                      "#9A7B06",
                  }}
                >
                  <AlertTriangle
                    size={15}
                  />

                  <span>
                    ยังไม่ได้แนบหลักฐาน
                    สามารถยื่นคำขอได้
                  </span>
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
                background:
                  "#EEF2F5",
                color: C.ink,
              }}
            >
              ย้อนกลับ
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
                <ArrowRight
                  size={15}
                />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setStep(1)
                  }
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border"
                  style={{
                    borderColor:
                      C.border,
                    color: C.ink,
                  }}
                >
                  <Pencil
                    size={14}
                  />
                  แก้ไข
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSubmit?.(
                      form
                    )
                  }
                  className="flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
                  }}
                >
                  <Send
                    size={14}
                  />
                  ยื่นคำขอ
                </button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}