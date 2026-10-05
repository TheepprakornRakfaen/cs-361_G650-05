/*
 * ข้อมูลหน้าแจ้งเตือน
 *
 * แจ้งเตือนมี 2 ประเภท
 *  1) type "claim"  — สร้างจากสถานะคำขอของผู้ใช้เอง (อนุมัติ / ไม่อนุมัติ / รอตรวจสอบ)
 *                     คำนวณสดจาก claims จึงไม่ต้องเก็บแยก และไม่แตะ store/backend
 *  2) type "news"   — ข่าวสารประกาศจากระบบ (ANNOUNCEMENTS ด้านล่าง)
 *
 * สถานะ "อ่านแล้ว" เก็บใน localStorage แยกตามผู้ใช้
 * id ของแจ้งเตือนคำขอผูกกับสถานะ (claim-<id>-<status>) ดังนั้นเมื่อสถานะเปลี่ยน
 * จะกลายเป็นแจ้งเตือนใหม่ที่ยังไม่อ่านโดยอัตโนมัติ
 *
 * TODO: เมื่อ backend พร้อม ให้เปลี่ยน ANNOUNCEMENTS และ buildNotifications
 *       ไปดึงจาก API (ใช้ shape เดียวกันนี้ได้เลย)
 */

// ข่าวสารตัวอย่าง — แก้ข้อความ/วันที่ได้ตามต้องการ
export const ANNOUNCEMENTS = [
  {
    id: "news-welcome",
    title: "ยินดีต้อนรับสู่ระบบเบิกค่าตอบแทนการสอน",
    description:
      "ยื่นคำขอ ติดตามสถานะ และดูประวัติการเบิกจ่ายได้ในที่เดียว หากมีข้อสงสัยกดปุ่ม “ติดต่อเรา” ที่หน้าแรก",
    date: "2026-09-01T09:00:00",
  },
  {
    id: "news-45h",
    title: "เกณฑ์ชั่วโมงการเบิก",
    description:
      "เบิกได้ไม่เกิน 45 ชั่วโมงต่อวิชาต่อเทอม และระบบนับรวมประวัติการสอนชดเชยให้อัตโนมัติ",
    date: "2026-09-10T09:00:00",
  },
  {
    id: "news-docs",
    title: "เตรียมเอกสารให้ครบก่อนยื่นคำขอ",
    description:
      "ตรวจสอบรายการเอกสารประกอบการเบิกที่หน้าแรกก่อนยื่น เพื่อลดโอกาสที่คำขอจะถูกส่งกลับ",
    date: "2026-09-20T09:00:00",
  },
];

const baht = (n) =>
  Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

/*
 * รหัสคำขอแบบสั้นสำหรับแสดงผล
 * - UUID จาก backend (c284d8f4-a2f0-...) → "#C284D8F4" (8 ตัวแรก)
 * - รหัสแบบเดิม (CL-2026-0005) → "#CL-2026-0005"
 */
export function shortClaimId(id) {
  const text = String(id ?? "");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(text);
  return `#${isUuid ? text.slice(0, 8).toUpperCase() : text}`;
}

function claimNotification(claim) {
  const when = claim.updatedAt || claim.statusUpdatedAt || claim.createdAt;
  const base = {
    type: "claim",
    claimId: claim.id,
    date: when,
  };
  const course = claim.courseCode && claim.courseCode !== "-" ? ` วิชา ${claim.courseCode}` : "";

  switch (claim.status) {
    case "Approved":
      return {
        ...base,
        id: `claim-${claim.id}-Approved`,
        kind: "approved",
        title: `คำขอ ${shortClaimId(claim.id)} ได้รับการอนุมัติแล้ว`,
        description: `${course ? course.trim() + " · " : ""}ยอดเบิก ${baht(claim.amount)} บาท`,
      };
    case "Rejected":
      return {
        ...base,
        id: `claim-${claim.id}-Rejected`,
        kind: "rejected",
        title: `คำขอ ${shortClaimId(claim.id)} ไม่ได้รับการอนุมัติ`,
        description: `${course ? course.trim() + " · " : ""}กรุณาตรวจสอบรายละเอียดและแก้ไขตามที่เจ้าหน้าที่แจ้ง`,
      };
    case "Submitted":
      return {
        ...base,
        // ใช้เวลาที่ยื่นจริงถ้า backend ส่งมา
        date: claim.submittedAt || when,
        id: `claim-${claim.id}-Submitted`,
        kind: "submitted",
        title: `ส่งคำขอ ${shortClaimId(claim.id)} เรียบร้อยแล้ว`,
        description: `${course ? course.trim() + " · " : ""}อยู่ระหว่างการตรวจสอบ`,
      };
    default:
      return null; // แบบร่างไม่ต้องแจ้งเตือน
  }
}

// รวมแจ้งเตือนทั้งหมด เรียงใหม่สุดก่อน
export function buildNotifications(claims = []) {
  const fromClaims = claims.map(claimNotification).filter(Boolean);
  const news = ANNOUNCEMENTS.map((a) => ({ ...a, type: "news", kind: "news" }));

  return [...fromClaims, ...news].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// ---------- สถานะอ่านแล้ว (localStorage) ----------
const readKey = (username) => `teaching-claim-system:notif-read:${username || "guest"}`;

export function loadReadIds(username) {
  try {
    const raw = JSON.parse(localStorage.getItem(readKey(username)) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveReadIds(username, ids) {
  try {
    localStorage.setItem(readKey(username), JSON.stringify(ids));
  } catch {
    /* เก็บไม่ได้ก็ไม่เป็นไร */
  }
}

// "5 นาทีที่แล้ว", "เมื่อวาน", "12 ก.ย. 2569"
export function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "เมื่อวาน";
  if (day < 7) return `${day} วันที่แล้ว`;
  return new Date(t).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}