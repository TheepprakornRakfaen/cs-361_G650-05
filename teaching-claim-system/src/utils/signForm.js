/*
 * สร้าง "แบบขอเบิกค่าตอบแทน (สำหรับลงนาม)" เป็นไฟล์ HTML พร้อมพิมพ์
 *
 * ขั้นตอนจริง
 *  1) ผู้ยื่น (อาจารย์ / TA) ดาวน์โหลดเอกสารนี้ตอนกรอกคำขอ
 *  2) พิมพ์ → ลงนามจริงบนกระดาษ (TA ให้อาจารย์ผู้สอนลงนามรับรอง,
 *     อาจารย์ให้หัวหน้าภาควิชา/ผู้มีอำนาจลงนาม)
 *  3) สแกน/ถ่ายภาพ แล้วแนบกลับเข้าระบบพร้อมหลักฐานประกอบตอนยื่นคำขอ
 *  4) ส่งเอกสารต้นฉบับให้ฝ่ายการเงินหลังคำขอได้รับอนุมัติ
 *
 * เปิดไฟล์ในเบราว์เซอร์แล้วกด พิมพ์ → บันทึกเป็น PDF ได้
 */
import {
  sessionMinutes,
  formatDuration,
  formatThaiDate,
  roundMoney,
} from "./time";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ผู้ที่ต้องลงนามรับรอง ขึ้นกับตำแหน่งของผู้ยื่น
function getSigners(roleKey) {
  const isTa = roleKey === "TA";

  return [
    { title: "ผู้ขอเบิก", note: "(ลงนามรับรองว่าข้อมูลถูกต้อง)" },
    isTa
      ? { title: "อาจารย์ผู้สอน", note: "(ผู้รับรองการปฏิบัติงานของผู้ช่วยสอน)" }
      : { title: "หัวหน้าภาควิชา / ผู้มีอำนาจลงนาม", note: "(ผู้รับรองการสอน)" },
  ];
}

/*
 * data = {
 *   claimantName, claimantRole (ข้อความ), roleKey, staffId,
 *   courseCode, courseName, sectionNo, semester, round,
 *   sessions: [{ date, hours, minutes }], rate, notes, claimCode?
 * }
 */
export function buildSignFormHtml(data) {
  const sessions = (data.sessions || [])
    .filter((s) => s.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const totalMinutes = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const rate = Number(data.rate || 0);
  const amount = roundMoney((totalMinutes / 60) * rate);

  const rows = sessions.length
    ? sessions
        .map(
          (s, i) => `<tr>
            <td class="c">${i + 1}</td>
            <td>${escapeHtml(formatThaiDate(s.date))}</td>
            <td class="c">${escapeHtml(formatDuration(sessionMinutes(s)))}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="c muted">ยังไม่ได้ระบุวันสอน</td></tr>`;

  const signers = getSigners(data.roleKey)
    .map(
      (signer) => `<div class="sign">
        <div class="line"></div>
        <p>ลงชื่อ ....................................................</p>
        <p>( ........................................................ )</p>
        <p class="b">${escapeHtml(signer.title)}</p>
        <p class="muted small">${escapeHtml(signer.note)}</p>
        <p>วันที่ ........ / ........ / ............</p>
      </div>`,
    )
    .join("");

  const printedAt = new Date().toLocaleString("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>แบบขอเบิกค่าตอบแทน ${escapeHtml(data.courseCode || "")}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "Noto Sans Thai", "TH Sarabun New", Tahoma, sans-serif; color: #12222f; font-size: 14px; line-height: 1.6; margin: 0; padding: 24px; }
  h1 { font-size: 20px; text-align: center; margin: 0 0 2px; }
  .sub { text-align: center; color: #5b6672; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; }
  th, td { border: 1px solid #8a97a3; padding: 6px 10px; text-align: left; }
  th { background: #eef3f7; }
  .c { text-align: center; }
  .r { text-align: right; }
  .info td { border: none; padding: 2px 8px 2px 0; vertical-align: top; }
  .info td:first-child { width: 160px; color: #5b6672; }
  .total td { font-weight: 700; background: #f7fafc; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 56px; }
  .sign { text-align: center; }
  .sign p { margin: 4px 0; }
  .line { height: 44px; }
  .b { font-weight: 700; }
  .muted { color: #5b6672; }
  .small { font-size: 12px; }
  .box { border: 1px dashed #8a97a3; padding: 10px 14px; margin-top: 22px; font-size: 12px; color: #5b6672; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>แบบขอเบิกค่าตอบแทนการสอน</h1>
  <p class="sub">เอกสารสำหรับลงนามจริง · แนบกลับเข้าระบบพร้อมหลักฐานประกอบการเบิก</p>

  <table class="info">
    <tr><td>ผู้ขอเบิก</td><td><b>${escapeHtml(data.claimantName || "-")}</b>${data.claimantRole ? ` (${escapeHtml(data.claimantRole)})` : ""}</td></tr>
    ${data.staffId ? `<tr><td>รหัสบุคลากร/นักศึกษา</td><td>${escapeHtml(data.staffId)}</td></tr>` : ""}
    <tr><td>รายวิชา</td><td>${escapeHtml(data.courseCode || "-")} ${escapeHtml(data.courseName || "")}${data.sectionNo ? ` (Section ${escapeHtml(data.sectionNo)})` : ""}</td></tr>
    <tr><td>ภาคการศึกษา / รอบ</td><td>${escapeHtml(data.semester || "-")} · ${escapeHtml(data.round || "-")}</td></tr>
    ${data.claimCode ? `<tr><td>เลขที่คำขอ</td><td>${escapeHtml(data.claimCode)}</td></tr>` : ""}
  </table>

  <table>
    <thead><tr><th class="c" style="width:60px">ลำดับ</th><th>วันที่สอน / ปฏิบัติงาน</th><th class="c" style="width:160px">เวลา</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="total"><td colspan="2" class="r">รวมเวลา</td><td class="c">${escapeHtml(formatDuration(totalMinutes))}</td></tr>
      <tr class="total"><td colspan="2" class="r">อัตรา ${rate.toLocaleString()} บาท/ชั่วโมง · จำนวนเงินที่ขอเบิก</td><td class="c">${amount.toLocaleString()} บาท</td></tr>
    </tfoot>
  </table>

  ${data.notes ? `<p><b>รายละเอียดเพิ่มเติม:</b> ${escapeHtml(data.notes)}</p>` : ""}

  <div class="signs">${signers}</div>

  <div class="box">
    พิมพ์จากระบบเมื่อ ${escapeHtml(printedAt)} · ข้อมูลในเอกสารต้องตรงกับคำขอที่ยื่นในระบบ
    หากแก้ไขข้อมูลคำขอหลังลงนาม ต้องดาวน์โหลดเอกสารใหม่และลงนามใหม่ทุกครั้ง
  </div>
</body>
</html>`;
}

function safeFileName(data) {
  const base = [data.courseCode, data.round, data.semester]
    .filter(Boolean)
    .join("-")
    .replace(/[^\w\u0E00-\u0E7F.-]+/g, "_");

  return `แบบขอเบิก-${base || "คำขอ"}.html`;
}

// ดาวน์โหลดเป็นไฟล์
export function downloadSignForm(data) {
  const blob = new Blob([buildSignFormHtml(data)], {
    type: "text/html;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = safeFileName(data);
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// เปิดในแท็บใหม่แล้วสั่งพิมพ์ (บันทึกเป็น PDF ได้จากหน้าต่างพิมพ์)
export function printSignForm(data) {
  const html = buildSignFormHtml(data).replace(
    "</body>",
    "<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)})</script></body>",
  );

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  window.open(url, "_blank", "noopener");

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
