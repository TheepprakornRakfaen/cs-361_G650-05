/*
 * เก็บหน้าที่เปิดอยู่ไว้ใน URL แบบ hash (#/review, #/detail/<id>)
 * → กดรีเฟรชแล้วอยู่หน้าเดิม และปุ่มย้อนกลับ/ไปข้างหน้าของเบราว์เซอร์ใช้ได้
 * ใช้ hash เพื่อไม่ต้องตั้งค่า rewrite ที่ฝั่งโฮสต์ (Amplify)
 */

// หน้าที่ต้องมีข้อมูลจากขั้นตอนก่อนหน้า รีเฟรชแล้วพากลับไปหน้าเริ่มของขั้นตอนนั้น
const RESTORE_AS = {
  "claim-create": "create",
};

export function readRoute(knownViews) {
  const [view = "", id = "", from = ""] = window.location.hash
    .replace(/^#\/?/, "")
    .split("/")
    .map((part) => decodeURIComponent(part));

  if (!view || !knownViews.has(view)) return { view: "home" };

  if (view === "detail") {
    return id ? { view, claimId: id, from: from || "myclaims" } : { view: "home" };
  }

  return { view: RESTORE_AS[view] || view };
}

export function buildRoute(view, { claimId, from } = {}) {
  if (view === "home") return "#/";

  if (view === "detail" && claimId) {
    return `#/detail/${encodeURIComponent(claimId)}/${encodeURIComponent(from || "myclaims")}`;
  }

  return `#/${view}`;
}
