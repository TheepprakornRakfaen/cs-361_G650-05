import { formatThaiDate, formatDuration, sessionMinutes } from "./time";

/*
 * แบบฟอร์มคำขอเบิกค่าตอบแทน สำหรับพิมพ์ให้ "ลงนามจริงบนกระดาษ"
 *
 * การกดอนุมัติในระบบไม่ใช่การลงนาม — ขั้นตอนจริง:
 *   พิมพ์แบบฟอร์ม → ผู้ยื่นลงนาม → ผู้มีอำนาจลงนาม → เจ้าหน้าที่รับเอกสาร (สถานะ 6) → การเงินจ่าย (สถานะ 7)
 *
 * เปิดหน้าต่างใหม่แล้วสั่งพิมพ์ (บันทึกเป็น PDF ได้จากหน้าต่างพิมพ์)
 */

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

function signatureBox(title) {
  return `
    <div class="sign">
      <div class="line"></div>
      <div>(.............................................................)</div>
      <div class="role">${escapeHtml(title)}</div>
      <div>วันที่ ........../........../..........</div>
    </div>`;
}

/*
 * ช่องลงนามตามประเภทผู้ยื่น
 *  - อาจารย์ยื่นเอง: อาจารย์ + เจ้าหน้าที่
 *  - TA: TA + อาจารย์เจ้าของวิชา (รับรองชั่วโมง) + เจ้าหน้าที่ + ผู้มีอำนาจ
 */
const SIGNERS = {
  TEACHER: ["อาจารย์ผู้ขอเบิก", "เจ้าหน้าที่ผู้ตรวจสอบ"],
  TA: [
    "ผู้ช่วยสอน (TA) ผู้ขอเบิก",
    "อาจารย์ผู้รับผิดชอบรายวิชา",
    "เจ้าหน้าที่ผู้ตรวจสอบ",
    "ผู้มีอำนาจอนุมัติ",
  ],
};

export function buildSignatureFormHtml({
  claim,
  courseName = "",
  claimantName = "",
  isTA = false,
}) {
  const signers = isTA ? SIGNERS.TA : SIGNERS.TEACHER;
  const sessions = Array.isArray(claim.sessions) ? claim.sessions : [];

  // อนุมัติแยกวัน → ใส่เฉพาะวันที่อนุมัติในแบบฟอร์ม
  const hasDecision = sessions.some((s) => s.decision);
  const rows = (hasDecision
    ? sessions.filter((s) => s.decision !== "rejected")
    : sessions
  ).sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const totalMinutes = rows.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const totalHours = totalMinutes / 60;

  const rate = claim.rate;
  const amount =
    hasDecision && rate != null
      ? totalHours * Number(rate)
      : claim.amount;

  const sessionRows =
    rows.length > 0
      ? rows
          .map(
            (s, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escapeHtml(formatThaiDate(s.date))}</td>
          <td class="c">${escapeHtml(formatDuration(sessionMinutes(s)))}</td>
        </tr>`
          )
          .join("")
      : `<tr><td class="c">1</td><td>${escapeHtml(
          formatThaiDate(claim.teachingDate)
        )}</td><td class="c">${escapeHtml(
          formatDuration(Number(claim.hours || 0) * 60)
        )}</td></tr>`;

  const printedAt = new Date().toLocaleString("th-TH");

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>แบบฟอร์มคำขอเบิก ${escapeHtml(claim.code || claim.id)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Sarabun", "TH Sarabun New", "Noto Sans Thai", Tahoma, sans-serif; color: #111; font-size: 14px; line-height: 1.6; margin: 0; }
  h1 { font-size: 20px; text-align: center; margin: 0 0 4px; }
  .sub { text-align: center; color: #444; margin-bottom: 18px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 14px; }
  .meta b { display: inline-block; min-width: 120px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
  th, td { border: 1px solid #333; padding: 6px 8px; }
  th { background: #f0f0f0; }
  .c { text-align: center; }
  .r { text-align: right; }
  .note { border: 1px dashed #888; padding: 8px 10px; font-size: 12.5px; color: #333; margin: 10px 0 24px; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 36px 40px; margin-top: 12px; }
  .sign { text-align: center; }
  .sign .line { border-bottom: 1px dotted #333; height: 40px; margin: 0 20px 4px; }
  .sign .role { font-weight: bold; }
  .foot { margin-top: 28px; font-size: 11px; color: #666; text-align: right; }
</style>
</head>
<body>
  <h1>${isTA ? "แบบคำขอเบิกค่าตอบแทนผู้ช่วยสอน (TA)" : "แบบคำขอเบิกค่าตอบแทนการสอน"}</h1>
  <div class="sub">เอกสารสำหรับลงนามจริง · การอนุมัติในระบบไม่ถือเป็นการลงนาม</div>

  <div class="meta">
    <div><b>เลขที่คำขอ</b> ${escapeHtml(claim.code || claim.id)}</div>
    <div><b>ภาคการศึกษา</b> ${escapeHtml(claim.termLabel || claim.semester || "-")}</div>
    <div><b>ผู้ขอเบิก</b> ${escapeHtml(claimantName || "-")}</div>
    <div><b>รอบการเบิก</b> ${escapeHtml(claim.round || claim.month || "-")}</div>
    <div style="grid-column: 1 / -1"><b>รายวิชา</b> ${escapeHtml(
      [claim.courseCode, courseName || claim.courseName].filter(Boolean).join(" — ") || "-"
    )}</div>
  </div>

  <table>
    <thead>
      <tr><th style="width:56px">ลำดับ</th><th>วันที่สอน</th><th style="width:160px">ชั่วโมง</th></tr>
    </thead>
    <tbody>${sessionRows}</tbody>
    <tfoot>
      <tr><td colspan="2" class="r"><b>รวมเวลาสอน</b></td><td class="c"><b>${escapeHtml(
        formatDuration(rows.length > 0 ? totalMinutes : Number(claim.hours || 0) * 60)
      )}</b></td></tr>
      <tr><td colspan="2" class="r"><b>อัตราค่าตอบแทน (บาท/ชั่วโมง)</b></td><td class="c">${money(rate)}</td></tr>
      <tr><td colspan="2" class="r"><b>จำนวนเงินที่ขอเบิก (บาท)</b></td><td class="c"><b>${money(amount)}</b></td></tr>
    </tfoot>
  </table>

  <div class="note">
    ${isTA
      ? "ข้าพเจ้าขอรับรองว่าได้ปฏิบัติงานช่วยสอนตามวันและเวลาข้างต้นจริง โดยอาจารย์ผู้รับผิดชอบรายวิชาเป็นผู้รับรองชั่วโมง"
      : "ข้าพเจ้าขอรับรองว่าได้ปฏิบัติการสอนตามวันและเวลาข้างต้นจริง"}
    ${hasDecision ? "<br/>* แสดงเฉพาะวันที่ได้รับอนุมัติในระบบ" : ""}
  </div>

  <div class="signs">
    ${signers.map(signatureBox).join("")}
  </div>

  <div class="foot">พิมพ์จากระบบเบิกค่าตอบแทนการสอน · ${escapeHtml(printedAt)}</div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

export function printSignatureForm(options) {
  const win = window.open("", "_blank");

  if (!win) {
    alert("เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง");
    return;
  }

  win.document.open();
  win.document.write(buildSignatureFormHtml(options));
  win.document.close();
}
