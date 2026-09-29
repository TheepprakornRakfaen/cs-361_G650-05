/*
 * ผู้ใช้จำลองสำหรับทดสอบฝั่ง frontend
 * ยังไม่เชื่อม Cognito — เก็บผู้ใช้ที่ล็อกอินไว้ใน localStorage
 * เมื่อฝั่ง backend ทำระบบ login เสร็จ ให้เปลี่ยน resolveUser ไปเรียก API แทน
 */
export const MOCK_USERS = [
  {
    username: "nitcha",
    email: "nitcha@tu.ac.th",
    name: "นางสาวนิชชา วรเมธาพงศ์",
    firstName: "นิชชา",
    role: "อาจารย์ผู้สอน",
    staffId: "T6500123",
    faculty: "คณะวิทยาศาสตร์และเทคโนโลยี",
    department: "สาขาวิชาวิทยาการคอมพิวเตอร์",
    phone: "02-564-4440 ต่อ 2001",
  },
  {
    username: "ta01",
    email: "ta01@tu.ac.th",
    name: "นายธีรภัทร ใจดี",
    firstName: "ธีรภัทร",
    role: "ผู้ช่วยสอน (TA)",
    staffId: "6509610001",
    faculty: "คณะวิทยาศาสตร์และเทคโนโลยี",
    department: "สาขาวิชาวิทยาการคอมพิวเตอร์",
    phone: "08x-xxx-xxxx",
  },
];

const SESSION_KEY = "teaching-claim-system:user";

/*
 * หาผู้ใช้จากอีเมล/รหัสผู้ใช้ที่กรอกในหน้า Login
 * ถ้าไม่ตรงกับผู้ใช้จำลอง จะใช้สิ่งที่กรอกเป็นชื่อแสดงผล
 * เพื่อให้ชื่อที่เข้าระบบกับชื่อในโปรไฟล์เป็นชื่อเดียวกันเสมอ
 */
export function resolveUser(identifier) {
  const input = identifier.trim();
  const key = input.toLowerCase();

  const found = MOCK_USERS.find(
    (user) =>
      user.email.toLowerCase() === key ||
      user.username.toLowerCase() === key
  );

  if (found) {
    return found;
  }

  const displayName = input.split("@")[0];

  return {
    username: displayName,
    email: input.includes("@") ? input : "",
    name: displayName,
    firstName: displayName,
    role: "ผู้ใช้งานระบบ",
  };
}

/*
 * ตัวอักษรย่อสำหรับรูปโปรไฟล์ — เอาจากชื่อจริง ไม่เอาคำนำหน้า (นาย/นางสาว)
 * และข้ามสระหน้า (เ แ โ ใ ไ) เช่น "เอกชัย" จะได้ "อ" ไม่ใช่ "เ"
 */
export function getInitial(user) {
  const name = (user?.firstName || user?.name || "").trim();
  const letter = name.replace(/^[เแโใไ]+/, "").charAt(0);

  return letter ? letter.toUpperCase() : "U";
}

export function loadSessionUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveSessionUser(user) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.error("Cannot save user to localStorage:", error);
  }
}
