/*
 * ข้อมูลส่วนตัวที่ผู้ใช้แก้ไขเองในหน้า Profile
 *
 * ตอนนี้ backend ยังไม่มี API สำหรับแก้ข้อมูลผู้ใช้
 * จึงเก็บไว้ใน localStorage แยกตาม username ไปก่อน
 * (อีเมล / role มาจาก Cognito แก้ไม่ได้)
 */

import { FACULTIES, getDepartments } from "./faculties";

const storageKey =(username) => `teaching-claim:profile:${username}`;

// ช่องที่อนุญาตให้แก้ไขได้
export const EDITABLE_FIELDS = [
  "name",
  "staffId",
  "phone",
  "faculty",
  "department",
];

export function loadProfileEdits(username) {
  if (!username) return {};

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(username)) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

// โยน error ออกไปถ้าบันทึกไม่ได้ (เช่น localStorage เต็ม / ถูกบล็อก) ให้หน้า Profile แสดงข้อความ
export function saveProfileEdits(username, edits) {
  if (!username) {
    throw new Error("ไม่พบข้อมูลผู้ใช้");
  }

  const data = {};
  EDITABLE_FIELDS.forEach((field) => {
    data[field] = String(edits[field] ?? "").trim();
  });

  localStorage.setItem(storageKey(username), JSON.stringify(data));
  return data;
}

// รวมข้อมูลที่แก้ไว้เข้ากับ user จาก Cognito
export function applyProfileEdits(user) {
  if (!user) return user;

  const edits = loadProfileEdits(user.username);
  const merged = { ...user };

  EDITABLE_FIELDS.forEach((field) => {
    if (edits[field]) merged[field] = edits[field];
  });

  // ตัวอักษรย่อบน avatar ใช้ firstName → ให้ตรงกับชื่อที่แก้
  if (edits.name) {
    merged.firstName = edits.name.split(/\s+/)[0];
  }

  return merged;
}

/*
 * ตรวจข้อมูลก่อนบันทึก
 * คืน object { field: "ข้อความ error" } (ว่าง = ผ่าน)
 */
export function validateProfile(form) {
  const errors = {};
  const name = String(form.name || "").trim();
  const staffId = String(form.staffId || "").trim();
  const phone = String(form.phone || "").replace(/[\s-]/g, "");

  if (!name) {
    errors.name = "กรุณากรอกชื่อ-นามสกุล";
  } else if (name.length > 100) {
    errors.name = "ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร";
  }

  if (staffId && !/^[A-Za-z0-9]{1,20}$/.test(staffId)) {
    errors.staffId = "ใช้ได้เฉพาะตัวอักษรอังกฤษและตัวเลข ไม่เกิน 20 ตัว";
  }

  if (phone && !/^0\d{8,9}$/.test(phone)) {
    errors.phone = "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก";
  }

  // คณะ / สาขา ต้องเป็นตัวเลือกจากรายการ และสาขาต้องอยู่ในคณะที่เลือก
  const faculty = String(form.faculty || "").trim();
  const department = String(form.department || "").trim();

  if (faculty && !FACULTIES.some((item) => item.name === faculty)) {
    errors.faculty = "กรุณาเลือกคณะจากรายการ";
  }

  if (department && !getDepartments(faculty).includes(department)) {
    errors.department = "กรุณาเลือกสาขาของคณะที่เลือก";
  }

  return errors;
}
