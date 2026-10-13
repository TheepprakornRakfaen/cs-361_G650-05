/*
 * สร้างและดาวน์โหลดไฟล์ CSV ฝั่งเบราว์เซอร์
 * - ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยถูก
 * - กัน CSV/Formula injection: ค่าที่ขึ้นต้นด้วย = + - @ จะถูกนำหน้าด้วย '
 */
function escapeCell(value) {
  let text = String(value ?? "");

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return /[",\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

export function toCsv(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}

export function downloadCsv(filename, headers, rows) {
  const blob = new Blob(["\uFEFF" + toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}