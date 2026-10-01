// ดัชนีค้นหาของหน้าแรก — แตกเป็นรายการย่อยเพื่อให้ผลลัพธ์ตรงจุด
// แต่ละรายการชี้ไปที่ id ของหัวข้อในหน้า Home เพื่อเลื่อนไปหาแบบสมูท
import {
  SCOPE,
  USER_TYPES,
  TEACHING_RATE,
  TA_RATES,
  CONDITIONS,
  DOCUMENTS,
  RELATED_DOCUMENTS,
  PROCESS_STEPS,
  TIMING,
  TEACHER_FEATURES,
  STAFF_FEATURES,
} from "./infoData";

export const FAQS = [
  {
    question: "ใครสามารถยื่นคำขอเบิกค่าตอบแทนการสอนได้บ้าง?",
    answer: "ผู้มีสิทธิ์ยื่นคำขอเบิกสามารถตรวจสอบได้จากส่วนผู้มีสิทธิ์ยื่นคำขอเบิก โดยระบบจะแยกบทบาทและรายละเอียดของผู้ใช้งานแต่ละประเภทไว้อย่างชัดเจน",
  },
  {
    question: "ต้องเตรียมเอกสารอะไรบ้างก่อนยื่นคำขอ?",
    answer: "สามารถตรวจสอบรายการเอกสารที่ต้องใช้ได้จากส่วนเอกสารประกอบการเบิก ซึ่งแยกข้อมูลที่เกี่ยวข้องไว้ให้ตรวจสอบก่อนเริ่มยื่นคำขอ",
  },
  {
    question: "ขั้นตอนการยื่นและตรวจสอบคำขอเป็นอย่างไร?",
    answer: "เริ่มจากตรวจสอบสิทธิ์และข้อมูลที่เกี่ยวข้อง เตรียมเอกสาร จากนั้นยื่นคำขอและติดตามสถานะตามขั้นตอนที่ระบบกำหนด",
  },
  {
    question: "สามารถตรวจสอบอัตราค่าตอบแทนได้ที่ไหน?",
    answer: "ดูรายละเอียดได้จากหัวข้ออัตราค่าตอบแทน ซึ่งรวบรวมอัตราค่าสอนอาจารย์และอัตราสำหรับ TA / ผู้ช่วยสอน",
  },
  {
    question: "หากไม่พบข้อมูลที่ต้องการควรทำอย่างไร?",
    answer: "สามารถใช้ช่องค้นหาด้านบนเพื่อค้นหาคำว่า อัตรา เอกสาร ขั้นตอน หรือหัวข้อที่เกี่ยวข้องกับสิ่งที่ต้องการตรวจสอบ",
  },
];

const entry = (sectionId, section, title, text = "") => ({
  sectionId,
  section,
  title,
  text,
  haystack: `${title} ${text} ${section}`.toLowerCase(),
});

export const SEARCH_INDEX = [
  ...RELATED_DOCUMENTS.map((d) =>
    entry("documents", "ประกาศและเอกสาร", d.title, d.description)
  ),
  ...SCOPE.included.map((s) => entry("scope", "ขอบเขตการเบิก · เบิกได้", s.title, s.desc)),
  ...SCOPE.excluded.map((s) => entry("scope", "ขอบเขตการเบิก · เบิกไม่ได้", s.title, s.desc)),
  ...USER_TYPES.map((u) => entry("users", "ผู้มีสิทธิ์", u.role, u.desc)),
  entry(
    "rates",
    "อัตราค่าตอบแทน",
    "ค่าสอนอาจารย์",
    `${TEACHING_RATE.values.join(" / ")} บาท/ชม. ${TEACHING_RATE.note || ""}`
  ),
  ...TA_RATES.map((r) => entry("rates", "อัตราค่าตอบแทน", r.label, `${r.who} ${r.rate} บาท/ชม.`)),
  ...CONDITIONS.map((c) => entry("conditions", "เงื่อนไขและหลักเกณฑ์", c)),
  ...[DOCUMENTS.internal, DOCUMENTS.external].map((d) =>
    entry("required-docs", "เอกสารประกอบการเบิก", d.title, d.items.join(" ・ "))
  ),
  ...PROCESS_STEPS.map((s, i) => entry("process", "วิธียื่นคำขอ", `${i + 1}. ${s.title}`, s.desc)),
  entry("timing", "ช่วงเวลาที่เกี่ยวข้อง", TIMING.cycle, TIMING.desc),
  ...FAQS.map((f) => entry("faq", "คำถามที่พบบ่อย", f.question, f.answer)),
  ...TEACHER_FEATURES.map((f) => entry("features", "ฟังก์ชันสำหรับอาจารย์", f)),
  ...STAFF_FEATURES.map((f) => entry("features", "ฟังก์ชันสำหรับเจ้าหน้าที่", f)),
];

export function searchInfo(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEARCH_INDEX.filter((e) => e.haystack.includes(q)).slice(0, limit);
}