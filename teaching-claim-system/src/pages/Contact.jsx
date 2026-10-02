import React, { useState } from "react";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import Field from "../components/Field";
import Select from "../components/Select";

// หัวข้อที่เลือกได้ในแบบฟอร์มติดต่อเรา
export const CONTACT_TOPICS = [
  "สอบถามสิทธิ์การเบิกค่าตอบแทน",
  "สอบถามอัตราค่าตอบแทน / การคำนวณ",
  "ปัญหาการเข้าสู่ระบบ / บัญชีผู้ใช้",
  "ปัญหาการยื่นคำขอ / ติดตามสถานะคำขอ",
  "เอกสารประกอบการเบิก",
  "แจ้งข้อมูลผิดพลาดของรายวิชา / งานสอน",
  "แจ้งปัญหาการใช้งานระบบ",
  "ข้อเสนอแนะ",
  "อื่น ๆ",
];

const STORAGE_KEY = "contact_requests";

const inputCls =
  "w-full rounded-xl px-4 py-3 text-sm outline-none border transition-shadow focus:shadow-[0_0_0_3px_rgba(62,127,193,0.18)]";
const inputStyle = (error) => ({
  background: "#FFFFFF",
  borderColor: error ? C.rose : C.border,
  color: C.ink,
});

export default function Contact({ user, onDone }) {
  const [form, setForm] = useState({
    topic: "",
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: "" }));
  };

  const validate = () => {
    const er = {};
    if (!form.topic) er.topic = "กรุณาเลือกหัวข้อที่ต้องการติดต่อ";
    if (!form.name.trim()) er.name = "กรุณากรอกชื่อ-นามสกุล";
    if (!form.email.trim()) er.email = "กรุณากรอกอีเมล";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      er.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!form.message.trim()) er.message = "กรุณาระบุรายละเอียด";
    return er;
  };

  const handleSubmit = () => {
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    // TODO: เมื่อ backend พร้อม ให้เปลี่ยนเป็นเรียก API ส่งเรื่องจริง
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      prev.push({
        id: Date.now(),
        ...form,
        username: user?.username || null,
        createdAt: new Date().toISOString(),
        status: "New",
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
    } catch {
      /* เก็บไม่ได้ก็ไม่เป็นไร */
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <SectionCard className="p-8 md:p-10 text-center" hoverable={false}>
          <CheckCircle2
            size={48}
            className="mx-auto mb-4"
            style={{ color: "#1E8E4F" }}
          />
          <h2 className="text-xl font-extrabold" style={{ color: C.ink }}>
            ส่งเรื่องเรียบร้อยแล้ว
          </h2>
          <p className="text-sm mt-2" style={{ color: C.sub }}>
            เราได้รับเรื่อง “{form.topic}” แล้ว
            และจะติดต่อกลับทางอีเมล {form.email}
          </p>
          <button
            onClick={onDone}
            className="mt-6 h-11 px-6 rounded-xl font-bold text-sm text-white"
            style={{ background: C.tealDark }}
          >
            กลับหน้าแรก
          </button>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto" style={{ animation: "fadein 0.4s ease-out" }}>
      <PageHeader
        icon={Mail}
        title="ติดต่อเรา"
        description="กรอกแบบฟอร์มด้านล่างเพื่อส่งเรื่องถึงเจ้าหน้าที่"
      />

      <SectionCard className="p-6 md:p-8" hoverable={false}>
        <div className="space-y-5">
          <Field label="หัวข้อที่ต้องการติดต่อ" required error={errors.topic}>
            <Select
              value={form.topic}
              onChange={set("topic")}
              className={inputCls}
              style={inputStyle(errors.topic)}
            >
              <option value="">-- เลือกหัวข้อ --</option>
              {CONTACT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="ชื่อ-นามสกุล" required error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                className={inputCls}
                style={inputStyle(errors.name)}
              />
            </Field>

            <Field label="เบอร์โทรศัพท์">
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="ไม่บังคับ"
                className={inputCls}
                style={inputStyle(false)}
              />
            </Field>
          </div>

          <Field label="อีเมลสำหรับติดต่อกลับ" required error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="name@example.com"
              className={inputCls}
              style={inputStyle(errors.email)}
            />
          </Field>

          <Field label="รายละเอียด" required error={errors.message}>
            <textarea
              rows={6}
              value={form.message}
              onChange={set("message")}
              placeholder="อธิบายเรื่องที่ต้องการสอบถามหรือแจ้งปัญหา"
              className={`${inputCls} resize-y`}
              style={inputStyle(errors.message)}
            />
          </Field>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onDone}
              className="h-11 px-6 rounded-xl font-semibold text-sm border hover:bg-[#F2F6F8] transition-colors"
              style={{ borderColor: C.border, color: C.ink }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-11 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: C.tealDark }}
            >
              <Send size={16} />
              ส่งเรื่อง
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
