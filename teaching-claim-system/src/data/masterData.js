/*
 * [V4] Master Data & External Exchange Store (ข้อมูลพื้นฐาน & การแลกเปลี่ยนข้อมูล - FR3 & FR10)
 *
 * จัดการข้อมูลพื้นฐาน:
 *  - รายวิชา (Courses)
 *  - ภาคการศึกษา (Academic Terms)
 *  - รอบการยื่น (Submission Periods)
 *  - นำเข้า/แลกเปลี่ยนข้อมูลภายนอก (Data Exchange / TU Registrar Sync - FR10)
 */

const COURSES_KEY = "teaching-claim-system:master-courses:v4";
const TERMS_KEY = "teaching-claim-system:master-terms:v4";
const PERIODS_KEY = "teaching-claim-system:master-periods:v4";
const IMPORT_LOG_KEY = "teaching-claim-system:import-logs:v4";

export const DEFAULT_COURSES = [
  {
    section_id: 1,
    course_code: "CS101",
    course_name_th: "การเขียนโปรแกรมคอมพิวเตอร์พื้นฐาน",
    course_name_en: "Fundamental Computer Programming",
    section_no: "650001",
    instructors: ["อ.วิรัตน์ ยิ่งมงคลเจริญ", "อ.ทดลอง ระบบ"],
    assistants: ["พี่ฟิว", "นายภูมิ ช่วยสอน"],
    hour: 18,
    max_hour: 45,
    rate: 600,
    status: "ACTIVE",
  },
  {
    section_id: 2,
    course_code: "CS213",
    course_name_th: "โครงสร้างข้อมูล",
    course_name_en: "Data Structures",
    section_no: "650001",
    instructors: ["อ.สมหญิง ตั้งใจสอน"],
    assistants: ["พี่จูน"],
    hour: 12,
    max_hour: 45,
    rate: 600,
    status: "ACTIVE",
  },
  {
    section_id: 3,
    course_code: "CS341",
    course_name_th: "วิศวกรรมซอฟต์แวร์",
    course_name_en: "Software Engineering",
    section_no: "650001",
    instructors: ["อ.วิรัตน์ ยิ่งมงคลเจริญ"],
    assistants: ["พี่ฟิว", "พี่จูน"],
    hour: 24,
    max_hour: 45,
    rate: 600,
    status: "ACTIVE",
  },
  {
    section_id: 4,
    course_code: "CS361",
    course_name_th: "การออกแบบสถาปัตยกรรมซอฟต์แวร์บนคลาวด์",
    course_name_en: "Cloud-Based Software Architecture",
    section_no: "650001",
    instructors: ["อ.วิรัตน์ ยิ่งมงคลเจริญ", "อ.วิชัย รักเรียน"],
    assistants: ["พี่ฟิว"],
    hour: 20,
    max_hour: 45,
    rate: 600,
    status: "ACTIVE",
  },
];

export const DEFAULT_TERMS = [
  {
    id: 1,
    year: 2568,
    semester: 2,
    label: "2/2568",
    start_date: "2026-01-12",
    end_date: "2026-05-15",
    status: "CLOSED",
  },
  {
    id: 2,
    year: 2568,
    semester: 3,
    label: "3/2568",
    start_date: "2026-06-01",
    end_date: "2026-07-31",
    status: "CLOSED",
  },
  {
    id: 3,
    year: 2569,
    semester: 1,
    label: "1/2569",
    start_date: "2026-08-10",
    end_date: "2026-12-11",
    status: "ACTIVE",
  },
];

const now = Date.now();
const DAY = 86400000;
const iso = (d) => new Date(now + d * DAY).toISOString();

export const DEFAULT_PERIODS = [
  {
    id: 1,
    term_id: 3,
    month: 9,
    year: 2569,
    label: "รอบกันยายน 2569",
    open_at: iso(-40),
    close_at: iso(-10),
    status: 0, // closed
  },
  {
    id: 2,
    term_id: 3,
    month: 10,
    year: 2569,
    label: "รอบตุลาคม 2569",
    open_at: iso(-15),
    close_at: iso(15),
    status: 1, // open
  },
  {
    id: 3,
    term_id: 3,
    month: 11,
    year: 2569,
    label: "รอบพฤศจิกายน 2569",
    open_at: iso(16),
    close_at: iso(45),
    status: 0, // upcoming
  },
];

export function getMasterCourses() {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    if (!raw) return DEFAULT_COURSES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COURSES;
  } catch {
    return DEFAULT_COURSES;
  }
}

export function saveMasterCourses(courses) {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  } catch (e) {
    console.error("Error saving courses:", e);
  }
}

export function saveMasterCourse(course) {
  const current = getMasterCourses();
  const idx = current.findIndex((c) => String(c.section_id) === String(course.section_id));
  let updated;
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...updated[idx], ...course };
  } else {
    const newCourse = {
      ...course,
      section_id: course.section_id || Date.now(),
      status: course.status || "ACTIVE",
    };
    updated = [...current, newCourse];
  }
  saveMasterCourses(updated);
  return updated;
}

export function deleteMasterCourse(sectionId) {
  const current = getMasterCourses();
  const filtered = current.filter((c) => String(c.section_id) !== String(sectionId));
  saveMasterCourses(filtered);
  return filtered;
}

export function getMasterTerms() {
  try {
    const raw = localStorage.getItem(TERMS_KEY);
    if (!raw) return DEFAULT_TERMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
}

export function saveMasterTerms(terms) {
  try {
    localStorage.setItem(TERMS_KEY, JSON.stringify(terms));
  } catch (e) {
    console.error("Error saving terms:", e);
  }
}

export function getMasterPeriods() {
  try {
    const raw = localStorage.getItem(PERIODS_KEY);
    if (!raw) return DEFAULT_PERIODS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PERIODS;
  } catch {
    return DEFAULT_PERIODS;
  }
}

export function saveMasterPeriods(periods) {
  try {
    localStorage.setItem(PERIODS_KEY, JSON.stringify(periods));
  } catch (e) {
    console.error("Error saving periods:", e);
  }
}

export function getImportLogs() {
  try {
    const raw = localStorage.getItem(IMPORT_LOG_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: "imp-001",
        source: "TU Registrar API (ระบบทะเบียนกลาง)",
        recordsCount: 4,
        type: "COURSES & ASSIGNMENTS",
        status: "SUCCESS",
        actor: "ผู้ดูแลระบบ",
        timestamp: new Date(Date.now() - 5 * DAY).toISOString(),
        details: "นำเข้าข้อมูลรายวิชา CS101, CS213, CS341, CS361 สำเร็จครบถ้วน",
      },
    ];
  } catch {
    return [];
  }
}

export function addImportLog(log) {
  try {
    const current = getImportLogs();
    const entry = {
      id: `imp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    const updated = [entry, ...current];
    localStorage.setItem(IMPORT_LOG_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Error adding import log:", e);
    return [];
  }
}

