// เลื่อนไปยังหัวข้อในหน้าแบบสมูท
// พื้นที่เลื่อนจริงคือ <main> (overflow-y-auto) ไม่ใช่ window
// จึงต้องสั่ง scrollTo ที่ <main> เอง ไม่งั้น scroll-behavior ของ html ไม่ทำงาน
export function scrollToSection(id, offset = 16) {
  const el = document.getElementById(id);
  if (!el) return false;

  const container = document.querySelector("main");

  if (container) {
    const top =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      offset;

    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  try {
    window.history.replaceState(null, "", `#${id}`);
  } catch {
    /* ไม่เป็นไร */
  }

  return true;
}