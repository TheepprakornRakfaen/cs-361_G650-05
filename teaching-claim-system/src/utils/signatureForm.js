import { formatThaiDate, formatDuration, sessionMinutes } from "./time";

/*
 * แบบฟอร์มคำขอเบิกค่าตอบแทน สำหรับพิมพ์ไป "ลงนามจริงบนกระดาษ"
 * (การกดอนุมัติในระบบไม่ใช่การลงนาม — ตามเอกสาร CS361 V3 Project 6)
 *
 * ลำดับการลงนาม
 *   อาจารย์ยื่นเอง : อาจารย์ (ก่อนยื่น) → เจ้าหน้าที่ (ตอนตรวจ) → ผู้มีอำนาจ (หลังอนุมัติ)
 *   TA            : TA + อาจารย์เจ้าของวิชารับรองชั่วโมง (ก่อนยื่น) → เจ้าหน้าที่ → ผู้มีอำนาจ
 * ผู้ยื่นพิมพ์ฟอร์มตอนสร้างคำขอ เซ็นแล้วสแกนแนบเป็นหลักฐาน
 * ต้นฉบับกระดาษส่งเจ้าหน้าที่ → บันทึก "ได้รับเอกสารลงนาม" (สถานะ 6) → การเงินจ่าย (สถานะ 7)
 */

const SIGNERS = {
  TEACHER: [
    { title: "อาจารย์ผู้ขอเบิก", when: "ลงนามก่อนยื่นคำขอ" },
    { title: "เจ้าหน้าที่ผู้ตรวจสอบ", when: "ลงนามเมื่อตรวจสอบเอกสาร" },
    { title: "ผู้มีอำนาจอนุมัติ", when: "ลงนามหลังอนุมัติในระบบ" },
  ],
  TA: [
    { title: "ผู้ช่วยสอน (TA) ผู้ขอเบิก", when: "ลงนามก่อนยื่นคำขอ" },
    { title: "อาจารย์ผู้รับผิดชอบรายวิชา", when: "รับรองชั่วโมง ก่อนยื่นคำขอ" },
    { title: "เจ้าหน้าที่ผู้ตรวจสอบ", when: "ลงนามเมื่อตรวจสอบเอกสาร" },
    { title: "ผู้มีอำนาจอนุมัติ", when: "ลงนามหลังอนุมัติในระบบ" },
  ],
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "-"
    : Number(value).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/* 1234.5 → "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์" */
const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readInteger(n) {
  if (n === 0) return "";
  if (n >= 1000000) {
    return readInteger(Math.floor(n / 1000000)) + "ล้าน" + readInteger(n % 1000000);
  }

  const digits = String(n).split("").map(Number);
  const len = digits.length;

  return digits
    .map((d, i) => {
      const place = len - i - 1;
      if (d === 0) return "";
      if (place === 1 && d === 1) return "สิบ";
      if (place === 1 && d === 2) return "ยี่สิบ";
      if (place === 0 && d === 1 && len > 1) return "เอ็ด";
      return DIGITS[d] + PLACES[place];
    })
    .join("");
}

export function bahtText(value) {
  const amount = Math.round(Number(value || 0) * 100) / 100;
  if (!amount) return "ศูนย์บาทถ้วน";

  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);

  return (
    (baht ? `${readInteger(baht)}บาท` : "") +
    (satang ? `${readInteger(satang)}สตางค์` : "ถ้วน")
  );
}

function signatureBox({ title, when }, name = "") {
  return `
    <div class="sign">
      <div class="sign-when">${escapeHtml(when)}</div>
      <div class="sign-line"></div>
      <div class="sign-name">( ${name ? escapeHtml(name) : "&nbsp;".repeat(48)} )</div>
      <div class="sign-title">${escapeHtml(title)}</div>
      <div class="sign-date">วันที่ ........ / ........ / ............</div>
    </div>`;
}

/*
 * data: { code, termLabel, round, courseCode, courseName, claimantName,
 *         positionLabel, sessions: [{ date, hours, minutes, decision? }],
 *         teachingDate, hours, rate, amount, notes, isTA }
 */
export function buildSignatureFormHtml(data) {
  const {
    code = "",
    termLabel = "",
    round = "",
    courseCode = "",
    courseName = "",
    claimantName = "",
    positionLabel = "",
    notes = "",
    rate,
    isTA = false,
  } = data;

  const signers = isTA ? SIGNERS.TA : SIGNERS.TEACHER;
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];

  // อนุมัติแยกวัน → ใส่เฉพาะวันที่อนุมัติ
  const hasDecision = sessions.some((s) => s.decision);
  const rows = (hasDecision
    ? sessions.filter((s) => s.decision !== "rejected")
    : sessions
  )
    .filter((s) => s.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const totalMinutes =
    rows.length > 0
      ? rows.reduce((sum, s) => sum + sessionMinutes(s), 0)
      : Number(data.hours || 0) * 60;

  const amount =
    rate != null && (hasDecision || data.amount == null || data.amount === "")
      ? Math.round((totalMinutes / 60) * Number(rate) * 100) / 100
      : Number(data.amount);

  const sessionRows =
    rows.length > 0
      ? rows
          .map(
            (s, i) => `
          <tr>
            <td class="c">${i + 1}</td>
            <td>${escapeHtml(formatThaiDate(s.date))}</td>
            <td class="c">${escapeHtml(formatDuration(sessionMinutes(s)))}</td>
            <td class="r">${rate != null ? money((sessionMinutes(s) / 60) * Number(rate)) : "-"}</td>
          </tr>`
          )
          .join("")
      : `<tr><td class="c">1</td><td>${escapeHtml(
          formatThaiDate(data.teachingDate)
        )}</td><td class="c">${escapeHtml(formatDuration(totalMinutes))}</td><td class="r">${money(amount)}</td></tr>`;

  const printedAt = new Date().toLocaleString("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const field = (label, value, wide = false) => `
    <div class="field${wide ? " wide" : ""}">
      <span class="label">${escapeHtml(label)}</span>
      <span class="value">${value ? escapeHtml(value) : '<span class="blank"></span>'}</span>
    </div>`;

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>แบบฟอร์มลงนาม ${escapeHtml(code || courseCode)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 14mm 14mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Sarabun", "TH Sarabun New", Tahoma, sans-serif; color: #1b2733; font-size: 13.5px; line-height: 1.55; margin: 0; background: #e9eef2; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 14mm; position: relative; }
  @media print { body { background: #fff; } .page { width: auto; min-height: auto; padding: 0; } .toolbar { display: none; } }

  .toolbar { position: sticky; top: 0; display: flex; justify-content: center; gap: 8px; padding: 10px; background: #1e5687; }
  .toolbar button { font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 6px 18px; cursor: pointer; background: #fff; color: #1e5687; }

  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid #1e5687; }
  .brand { display: flex; gap: 10px; align-items: center; }
  .logo { width: 42px; height: 42px; border-radius: 10px; background: #1e5687; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
  .brand small { display: block; color: #5b6672; font-size: 11.5px; }
  .brand b { font-size: 15px; }
  .code { text-align: right; font-size: 12px; color: #5b6672; }
  .code b { display: block; font-size: 14px; color: #1b2733; }

  h1 { text-align: center; font-size: 19px; margin: 14px 0 2px; }
  .sub { text-align: center; color: #b4531a; font-size: 12px; margin-bottom: 14px; }

  .section-title { font-weight: 700; font-size: 13px; color: #1e5687; margin: 14px 0 6px; display: flex; align-items: center; gap: 6px; }
  .section-title::before { content: ""; width: 4px; height: 14px; background: #1e5687; border-radius: 2px; }

  .fields { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cfd8df; border-radius: 8px; overflow: hidden; }
  .field { display: flex; border-bottom: 1px solid #e3e9ee; }
  .field:nth-child(odd):not(.wide) { border-right: 1px solid #e3e9ee; }
  .field.wide { grid-column: 1 / -1; }
  .field:last-child { border-bottom: 0; }
  .label { width: 112px; flex-shrink: 0; background: #f3f6f8; color: #5b6672; padding: 6px 10px; font-size: 12.5px; }
  .value { padding: 6px 10px; font-weight: 600; }
  .blank { display: inline-block; min-width: 160px; border-bottom: 1px dotted #8a96a0; height: 1em; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #1e5687; color: #fff; font-weight: 600; padding: 6px 8px; }
  thead th:first-child { border-top-left-radius: 6px; }
  thead th:last-child { border-top-right-radius: 6px; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e3e9ee; }
  tbody tr:nth-child(even) td { background: #f8fafb; }
  tfoot td { padding: 6px 8px; }
  .total td { border-top: 2px solid #1e5687; font-weight: 700; }
  .grand td { background: #eaf3fa; font-weight: 700; font-size: 14px; }
  .c { text-align: center; }
  .r { text-align: right; }
  .words { text-align: right; color: #1e5687; font-weight: 600; margin-top: 4px; }

  .cert { border-left: 4px solid #1e8e4f; background: #f1faf4; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-top: 12px; font-size: 13px; }
  .notes { font-size: 12.5px; color: #5b6672; margin-top: 6px; }

  .signs { display: grid; grid-template-columns: repeat(${signers.length > 3 ? 2 : signers.length}, 1fr); gap: 14px; margin-top: 8px; }
  .sign { border: 1px solid #cfd8df; border-radius: 8px; padding: 8px 10px 10px; text-align: center; break-inside: avoid; }
  .sign-when { display: inline-block; font-size: 10.5px; color: #1e5687; background: #e8f0fa; border-radius: 999px; padding: 1px 10px; }
  .sign-line { border-bottom: 1px dotted #1b2733; height: 44px; margin: 0 10px 4px; }
  .sign-name { font-size: 12.5px; white-space: nowrap; overflow: hidden; }
  .sign-title { font-weight: 700; }
  .sign-date { font-size: 12px; color: #5b6672; margin-top: 2px; }

  .office { margin-top: 14px; border: 1.5px dashed #8a96a0; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; }
  .office b { color: #5b6672; }
  .office-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; margin-top: 4px; }
  .check { display: inline-block; width: 11px; height: 11px; border: 1.2px solid #1b2733; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }

  .foot { margin-top: 12px; display: flex; justify-content: space-between; font-size: 10.5px; color: #8a96a0; }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>
    <button onclick="window.close()">ปิด</button>
  </div>

  <div class="page">
    <div class="head">
      <div class="brand">
        <div class="logo">฿</div>
        <div>
          <b>ระบบเบิกค่าตอบแทนการสอน</b>
          <small>Teaching Claim System · ภาคการศึกษา ${escapeHtml(termLabel || "-")}</small>
        </div>
      </div>
      <div class="code">
        เลขที่คำขอ
        <b>${code ? escapeHtml(code) : "................................"}</b>
      </div>
    </div>

    <h1>${isTA ? "แบบคำขอเบิกค่าตอบแทนผู้ช่วยสอน (TA)" : "แบบคำขอเบิกค่าตอบแทนการสอน"}</h1>
    <div class="sub">เอกสารสำหรับลงนามจริงบนกระดาษ · การอนุมัติในระบบไม่ถือเป็นการลงนาม</div>

    <div class="section-title">ข้อมูลผู้ขอเบิก</div>
    <div class="fields">
      ${field("ชื่อ-นามสกุล", claimantName)}
      ${field("ตำแหน่ง", positionLabel || (isTA ? "ผู้ช่วยสอน (TA)" : "อาจารย์ผู้สอน"))}
      ${field("รายวิชา", [courseCode, courseName].filter(Boolean).join(" — "), true)}
      ${field("ภาคการศึกษา", termLabel)}
      ${field("รอบการเบิก", round)}
    </div>

    <div class="section-title">รายละเอียดการ${isTA ? "ปฏิบัติงานช่วยสอน" : "สอน"}</div>
    <table>
      <thead>
        <tr><th style="width:52px">ลำดับ</th><th style="text-align:left">วันที่</th><th style="width:130px">ชั่วโมง</th><th style="width:130px;text-align:right">จำนวนเงิน (บาท)</th></tr>
      </thead>
      <tbody>${sessionRows}</tbody>
      <tfoot>
        <tr class="total"><td colspan="2" class="r">รวม ${rows.length || 1} วัน</td><td class="c">${escapeHtml(formatDuration(totalMinutes))}</td><td class="r">${money(amount)}</td></tr>
        <tr><td colspan="3" class="r">อัตราค่าตอบแทน</td><td class="r">${money(rate)} บาท/ชม.</td></tr>
        <tr class="grand"><td colspan="3" class="r">รวมเป็นเงินที่ขอเบิก</td><td class="r">${money(amount)}</td></tr>
      </tfoot>
    </table>
    <div class="words">(${escapeHtml(bahtText(amount))})</div>
    ${hasDecision ? '<div class="notes">* แสดงเฉพาะวันที่ได้รับอนุมัติในระบบ</div>' : ""}
    ${notes ? `<div class="notes">หมายเหตุ: ${escapeHtml(notes)}</div>` : ""}

    <div class="cert">
      ${isTA
        ? "ข้าพเจ้าขอรับรองว่าได้ปฏิบัติงานช่วยสอนตามวันและเวลาข้างต้นจริง และอาจารย์ผู้รับผิดชอบรายวิชาได้ตรวจสอบและรับรองชั่วโมงแล้ว"
        : "ข้าพเจ้าขอรับรองว่าได้ปฏิบัติการสอนตามวันและเวลาข้างต้นจริง และไม่ได้เบิกซ้ำกับคำขออื่น"}
    </div>

    <div class="section-title">การลงนาม</div>
    <div class="signs">
      ${signers.map((s, i) => signatureBox(s, i === 0 ? claimantName : "")).join("")}
    </div>

    <div class="office">
      <b>สำหรับเจ้าหน้าที่</b>
      <div class="office-grid">
        <span><span class="check"></span>ได้รับต้นฉบับลงนามครบ</span>
        <span>วันที่รับ ........ / ........ / ............</span>
        <span>ผู้รับ ..............................................</span>
        <span><span class="check"></span>ส่งการเงินแล้ว</span>
        <span>วันที่ส่ง ........ / ........ / ............</span>
        <span>เลขที่อ้างอิง ...................................</span>
      </div>
    </div>

    <div class="foot">
      <span>พิมพ์จากระบบเบิกค่าตอบแทนการสอน · ${escapeHtml(printedAt)}</span>
      <span>${escapeHtml(code || "")}</span>
    </div>
  </div>
</body>
</html>`;
}

export function printSignatureForm(data) {
  const win = window.open("", "_blank");

  if (!win) {
    alert("เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง");
    return;
  }

  win.document.open();
  win.document.write(buildSignatureFormHtml(data));
  win.document.close();
}
