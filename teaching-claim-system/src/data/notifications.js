import { PERMISSION as P, can } from "./roles";
import { STATUS } from "./workflow";

/*
 * ข้อมูลหน้าแจ้งเตือน
 *
 * แจ้งเตือนมี 3 กลุ่ม (สร้างสดจากคำขอที่โหลดมาแล้ว ไม่ต้องเก็บแยกที่ backend)
 *  1) type "claim", scope "own"   — สถานะคำขอของผู้ใช้เอง (อนุมัติ / ไม่อนุมัติ / ส่งกลับ / ตรวจสอบแล้ว)
 *  2) type "claim", scope "queue" — งานที่รอผู้ตรวจสอบ/ผู้อนุมัติดำเนินการ (ตามบทบาท)
 *       ผู้ตรวจสอบ : คำขอที่ยังไม่ผ่านการตรวจสอบ
 *       ผู้อนุมัติ  : คำขอที่ผู้ตรวจสอบส่งต่อมาแล้ว
 *       ผู้ดูแลระบบ : ไม่มี (ดูอย่างเดียว)
 *  3) type "news" — ข่าวสารประกาศจากระบบ (ANNOUNCEMENTS ด้านล่าง)
 *
 * สถานะ "อ่านแล้ว" เก็บใน localStorage แยกตามผู้ใช้
 * id ผูกกับเหตุการณ์ (สถานะ + เวลาที่ยื่น/ตรวจ) เมื่อเกิดเหตุการณ์ใหม่ เช่น ถูกส่งกลับครั้งที่สอง
 * จะเป็นแจ้งเตือนใหม่ที่ยังไม่อ่านโดยอัตโนมัติ
 *
 * informational = แจ้งให้ทราบเฉย ๆ (เช่น "คุณเพิ่งยื่นคำขอ") ไม่นับเป็นรายการที่ยังไม่อ่าน
 *
 * TODO: เมื่อ backend พร้อม ให้เปลี่ยน ANNOUNCEMENTS ไปดึงจาก API (ใช้ shape เดียวกันนี้ได้เลย)
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

const claimLabel = (claim) =>
  claim.code ? `#${claim.code}` : shortClaimId(claim.id);

const courseText = (claim) =>
  claim.courseCode && claim.courseCode !== "-" ? `วิชา ${claim.courseCode} · ` : "";

// แจ้งเตือนสถานะคำขอของผู้ใช้เอง
function ownClaimNotification(claim) {
  const when = claim.updatedAt || claim.statusUpdatedAt || claim.createdAt;
  const base = { type: "claim", scope: "own", claimId: claim.id, date: when };
  const course = courseText(claim);

  switch (claim.status) {
    case "Approved":
      return {
        ...base,
        id: `claim-${claim.id}-Approved`,
        kind: "approved",
        title: `คำขอ ${claimLabel(claim)} ได้รับการอนุมัติแล้ว`,
        description: `${course}ยอดเบิก ${baht(claim.amount)} บาท · รอจ่ายเงิน`,
      };
    case "Paid":
      return {
        ...base,
        id: `claim-${claim.id}-Paid-${claim.paidAt || ""}`,
        date: claim.paidAt || when,
        kind: "paid",
        title: `คำขอ ${claimLabel(claim)} จ่ายเงินแล้ว`,
        description: `${course}ยอด ${baht(claim.amount)} บาท${
          claim.paidAccountMasked ? ` · เข้าบัญชี ${claim.paidAccountMasked}` : ""
        }`,
      };
    case "Rejected":
      return {
        ...base,
        id: `claim-${claim.id}-Rejected`,
        kind: "rejected",
        title: `คำขอ ${claimLabel(claim)} ไม่ได้รับการอนุมัติ`,
        description: `${course}ดูเหตุผลในรายละเอียดคำขอ หากต้องการเบิกรายการนี้ให้ยื่นคำขอใหม่`,
      };
    case "Returned":
      return {
        ...base,
        // ผูกกับรอบที่ยื่น: ถูกส่งกลับซ้ำหลังยื่นใหม่ จะเป็นแจ้งเตือนใหม่
        id: `claim-${claim.id}-Returned-${claim.submittedAt || ""}`,
        kind: "returned",
        title: `คำขอ ${claimLabel(claim)} ถูกส่งกลับให้แก้ไข`,
        description: `${course}เปิดดูสิ่งที่ต้องแก้ไข แล้วยื่นใหม่`,
      };
    case "Reviewed":
      return {
        ...base,
        date: claim.reviewedAt || when,
        id: `claim-${claim.id}-Reviewed-${claim.reviewedAt || ""}`,
        kind: "reviewed",
        title: `คำขอ ${claimLabel(claim)} ผ่านการตรวจสอบแล้ว`,
        description: `${course}ส่งต่อผู้อนุมัติ อยู่ระหว่างรอพิจารณา`,
      };
    case "Submitted":
      return {
        ...base,
        // ใช้เวลาที่ยื่นจริงถ้า backend ส่งมา
        date: claim.submittedAt || when,
        id: `claim-${claim.id}-Submitted-${claim.submittedAt || ""}`,
        kind: "submitted",
        informational: true, // เป็นการกระทำของผู้ใช้เอง ไม่ต้องเด้งเป็นรายการใหม่
        title: `ส่งคำขอ ${claimLabel(claim)} เรียบร้อยแล้ว`,
        description: `${course}อยู่ระหว่างการตรวจสอบ`,
      };
    default:
      return null; // แบบร่างไม่ต้องแจ้งเตือน
  }
}

// งานที่รอให้ผู้ตรวจสอบ/ผู้อนุมัติดำเนินการ (ตามลำดับขั้น: ตรวจสอบก่อน แล้วจึงอนุมัติ)
function queueNotification(claim, user) {
  if (claim.ownerSub && claim.ownerSub === user?.cognitoSub) return null;

  const who = claim.claimantName ? `ผู้ยื่น ${claim.claimantName}` : "";
  const course = courseText(claim);
  const detail = `${course}${who}`.replace(/ · $/, "");
  const base = { type: "claim", scope: "queue", claimId: claim.id };

  // ผู้อนุมัติ: เฉพาะคำขอที่ผู้ตรวจสอบส่งต่อมาแล้ว (สถานะ 2)
  if (can(user, P.CLAIM_APPROVE)) {
    if (claim.status !== STATUS.REVIEWED) return null;

    return {
      ...base,
      date: claim.reviewedAt || claim.updatedAt || claim.createdAt,
      id: `queue-${claim.id}-ToApprove-${claim.reviewedAt || ""}`,
      kind: "toApprove",
      // ผู้ตรวจสอบไม่แน่ใจหลักฐาน → บอกให้ชัดว่าต้องตรวจหลักฐานก่อนตัดสินใจ
      title: claim.escalation
        ? `คำขอ ${claimLabel(claim)} ขอให้ตรวจสอบหลักฐาน`
        : `คำขอ ${claimLabel(claim)} รอพิจารณาอนุมัติ`,
      description: claim.escalation?.comment
        ? `ผู้ตรวจสอบไม่แน่ใจ: ${claim.escalation.comment}`
        : detail || "ผู้ตรวจสอบส่งต่อมาแล้ว",
    };
  }

  // ผู้ตรวจสอบ: คำขอที่ยื่นมาใหม่ / ยื่นใหม่หลังแก้ไข (สถานะ 1) — ผู้อนุมัติไม่ต้องได้รับ
  if (
    can(user, P.CLAIM_REVIEW) &&
    !can(user, P.CLAIM_APPROVE) &&
    claim.status === STATUS.SUBMITTED
  ) {
    return {
      ...base,
      date: claim.submittedAt || claim.updatedAt || claim.createdAt,
      // ยื่นใหม่หลังถูกส่งกลับ → submittedAt เปลี่ยน → แจ้งเตือนใหม่
      id: `queue-${claim.id}-ToReview-${claim.submittedAt || ""}`,
      kind: "toReview",
      title: `คำขอ ${claimLabel(claim)} รอตรวจสอบ`,
      description: detail || "มีคำขอใหม่รอตรวจสอบ",
    };
  }

  return null;
}

/*
 * รวมแจ้งเตือนทั้งหมด เรียงใหม่สุดก่อน
 *  ownClaims   — คำขอของผู้ใช้เอง (ผู้ยื่นเท่านั้น)
 *  queueClaims — คิวตรวจสอบ/อนุมัติ (ผู้มีสิทธิ์ดูคิวเท่านั้น)
 */
export function buildNotifications({
  ownClaims = [],
  queueClaims = [],
  user = null,
  announcements = ANNOUNCEMENTS,
} = {}) {
  const own = can(user, P.CLAIM_CREATE)
    ? ownClaims.map(ownClaimNotification).filter(Boolean)
    : [];

  const queue = can(user, P.CLAIM_VIEW_ALL)
    ? queueClaims.map((c) => queueNotification(c, user)).filter(Boolean)
    : [];

  const news = announcements.map((a) => ({ ...a, type: "news", kind: "news" }));

  return [...own, ...queue, ...news].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// ---------- สถานะอ่านแล้ว (localStorage) ----------
export const readKey = (username) => `teaching-claim-system:notif-read:${username || "guest"}`;

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
    // เก็บเฉพาะ 500 รายการล่าสุด กัน localStorage โตไม่จำกัด
    localStorage.setItem(readKey(username), JSON.stringify(ids.slice(-500)));
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