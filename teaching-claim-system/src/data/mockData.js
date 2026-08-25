export const COURSES = [
  { code: "CS101", name: "Introduction to Programming", rate: 200, quota: 45, used: 13 },
  { code: "CS102", name: "Data Structures", rate: 220, quota: 45, used: 8 },
  { code: "CS341", name: "Software Engineering", rate: 250, quota: 45, used: 20 },
  { code: "CS361", name: "Operating Systems", rate: 230, quota: 45, used: 15 },
  { code: "CS232", name: "Database Systems", rate: 210, quota: 45, used: 12 },
];

export const ROUNDS = [
  { id: "r1", label: "รอบที่ 2", period: "1 – 31 สิงหาคม 2569", deadline: "31 สิงหาคม 2569", status: "Open", courseCode: "CS101" },
  { id: "r2", label: "รอบที่ 2", period: "1 – 31 สิงหาคม 2569", deadline: "31 สิงหาคม 2569", status: "Open", courseCode: "CS102" },
  { id: "r3", label: "รอบที่ 1", period: "1 – 31 กรกฎาคม 2569", deadline: "31 กรกฎาคม 2569", status: "Closed", courseCode: "CS341" },
  { id: "r4", label: "รอบที่ 1", period: "1 – 30 มิถุนายน 2569", deadline: "30 มิถุนายน 2569", status: "Closed", courseCode: "CS361" },
];

export const INITIAL_CLAIMS = [
  { id: "CLM-2026-001", courseCode: "CS101", month: "สิงหาคม 2026", hours: 10, rate: 200, amount: 2000, status: "Pending", teachingDate: "15 Aug 2026", notes: "สอนชดเชยคาบวันศุกร์", evidence: "teaching-evidence.pdf" },
  { id: "CLM-2026-002", courseCode: "CS101", month: "สิงหาคม 2026", hours: 4, rate: 200, amount: 800, status: "Pending", teachingDate: "18 Aug 2026", notes: "", evidence: "attendance-log.pdf" },
  { id: "CLM-2026-003", courseCode: "CS361", month: "สิงหาคม 2026", hours: 4.5, rate: 200, amount: 900, status: "Pending", teachingDate: "20 Aug 2026", notes: "", evidence: "lab-sheet.pdf" },
  { id: "CLM-2026-004", courseCode: "CS102", month: "กรกฎาคม 2026", hours: 5, rate: 200, amount: 1000, status: "Approved", teachingDate: "10 Jul 2026", notes: "", evidence: "roster.pdf" },
  { id: "CLM-2026-005", courseCode: "CS341", month: "กรกฎาคม 2026", hours: 3.2, rate: 250, amount: 800, status: "Approved", teachingDate: "12 Jul 2026", notes: "", evidence: "roster.pdf" },
  { id: "CLM-2026-006", courseCode: "CS341", month: "กรกฎาคม 2026", hours: 2.4, rate: 250, amount: 600, status: "Approved", teachingDate: "19 Jul 2026", notes: "", evidence: "roster.pdf" },
  { id: "CLM-2026-007", courseCode: "CS232", month: "มิถุนายน 2026", hours: 3, rate: 200, amount: 600, status: "Rejected", teachingDate: "5 Jun 2026", notes: "", evidence: "note.pdf" },
  { id: "CLM-2026-008", courseCode: "CS232", month: "มิถุนายน 2026", hours: 4, rate: 200, amount: 800, status: "Draft", teachingDate: "9 Jun 2026", notes: "", evidence: "" },
  { id: "CLM-2026-009", courseCode: "CS361", month: "มิถุนายน 2026", hours: 5, rate: 200, amount: 1000, status: "Rejected", teachingDate: "14 Jun 2026", notes: "", evidence: "note.pdf" },
];

export const courseByCode = (code) => COURSES.find((c) => c.code === code) || {};
