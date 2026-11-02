import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Wallet,
  Users,
  Settings,
  Database,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  Check,
  X,
  Sliders,
  DollarSign,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import RoleBadge from "../components/RoleBadge";
import Field from "../components/Field";
import Select from "../components/Select";
import ConfirmDialog from "../components/ConfirmDialog";

import {
  getCompensationTypes,
  saveCompensationType,
  deleteCompensationType,
  DEFAULT_COMPENSATION_TYPES,
} from "../data/compensationTypes";

import {
  getSystemRules,
  saveSystemRules,
  DEFAULT_RULES,
} from "../data/rulesConfig";

import {
  getMasterCourses,
  saveMasterCourse,
  deleteMasterCourse,
  getMasterTerms,
  saveMasterTerms,
  getMasterPeriods,
  saveMasterPeriods,
  getImportLogs,
  addImportLog,
  DEFAULT_COURSES,
} from "../data/masterData";

import {
  ROLE,
  ROLE_META,
  ROLE_DESCRIPTION,
  ROLE_PERMISSIONS,
  PERMISSION_META,
  OWN_ONLY_PERMISSIONS,
  PERMISSION as P,
  can,
} from "../data/roles";

import { MOCK_USERS } from "../data/users";
import { getDevUser } from "../services/devAuth";
import {
  getCompensationTypes as fetchCompensationTypes,
  getTerms,
  getCourses,
  getPeriods,
  getAdminUsers,
  createSection,
  deleteSection,
  getSectionStaff,
  saveSectionStaff,
  removeSectionStaff,
} from "../services/api";

const baht = (n) => `฿${Number(n || 0).toLocaleString("th-TH")}`;

// แถวต่อหน้าของตารางรายวิชา / รอบการยื่น
const PAGE_SIZE = 10;

/*
 * แถวของหน้าปัจจุบัน + จำนวนทั้งหมด
 * API ส่ง total มา = backend แบ่งหน้าให้แล้ว (list คือหน้านั้นพอดี)
 * ไม่มี total (Lambda รุ่นเก่า / โหมดทดลอง / รายการในเครื่อง) = กรองแล้วตัดหน้าเอง
 */
function toPage(data, list, offset, matches = () => true) {
  if (data?.total !== undefined && data?.total !== null) {
    return { rows: list, total: Number(data.total) };
  }
  const filtered = list.filter(matches);
  return { rows: filtered.slice(offset, offset + PAGE_SIZE), total: filtered.length };
}

// ค้นแบบเดียวกับ backend (?q=) — รหัส / ชื่อไทย / ชื่ออังกฤษ ไม่สนตัวพิมพ์
const matchesCourse = (c, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [c.course_code, c.course_name_th, c.course_name_en].some((v) =>
    String(v ?? "").toLowerCase().includes(needle)
  );
};

// ตัวกรองสถานะผู้สอน (?staff=) — ค่าตรงกับ STAFF_FILTERS ใน Lambda ClaimsPeriodTermCourses
const STAFF_FILTER_OPTIONS = [
  { value: "", label: "ทุกสถานะผู้สอน" },
  { value: "none", label: "ยังไม่มีผู้สอน" },
  { value: "assigned", label: "มีผู้สอนแล้ว" },
  { value: "used", label: "เบิกชั่วโมงแล้ว" },
  { value: "full", label: "ใช้ครบโควตา" },
];

// แบบเดียวกับ backend — ใช้ตอนกรองในเครื่อง (staff_count/max_hour/hour = รวมทั้ง section)
const matchesStaffFilter = (c, filter) => {
  const count = Number(c.staff_count ?? 0);
  const max = Number(c.max_hour ?? 0);
  const used = Number(c.hour ?? 0);
  switch (filter) {
    case "none": return count === 0;
    case "assigned": return count > 0;
    case "used": return used > 0;
    case "full": return max > 0 && used >= max;
    default: return true;
  }
};

// แถบเปลี่ยนหน้า: "แสดง 11–20 จาก 37" + ก่อนหน้า / เลขหน้า / ถัดไป
function Pager({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;

  // เลขหน้ารอบ ๆ หน้าปัจจุบัน + หน้าแรก/สุดท้าย ที่เหลือย่อเป็น …
  const nums = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);

  const btn = "min-w-8 h-8 px-2 rounded-full text-xs font-bold flex items-center justify-center";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t text-xs text-slate-500">
      <span>
        แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} จาก {total} รายการ
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={`${btn} hover:bg-slate-100 disabled:opacity-30`}
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft size={15} />
        </button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
            <button
              type="button"
              onClick={() => onChange(n)}
              className={`${btn} ${n === page ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700"}`}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className={`${btn} hover:bg-slate-100 disabled:opacity-30`}
          title="หน้าถัดไป"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export default function AdminManagement({ user, claims = [], onReload, terms: appTerms = [] }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | compTypes | masterData | rules | users | dataExchange
  const [masterSubTab, setMasterSubTab] = useState("courses"); // courses | terms | staff

  // กล่องยืนยันทั่วไป (แทน window.confirm) — { title, message, confirmText, onConfirm }
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = (options) => setConfirmState(options);

  // Rules state
  const [rules, setRules] = useState(getSystemRules);
  const [rulesSavedMsg, setRulesSavedMsg] = useState("");

  // Compensation types state
  const [compTypes, setCompTypes] = useState(getCompensationTypes);
  // true = รายการมาจาก GET /api/compensation-types (อ่านอย่างเดียว ยังไม่มี API เพิ่ม/แก้/ลบ)
  const [compTypesFromApi, setCompTypesFromApi] = useState(false);

  useEffect(() => {
    let active = true;

    fetchCompensationTypes()
      .then((data) => {
        const types = Array.isArray(data?.types) ? data.types : [];

        if (!active || types.length === 0) return;

        setCompTypes(
          types.map((t) => ({
            id: String(t.id),
            code: t.code,
            name: t.name,
            defaultRate: Number(t.hourly_rate),
            status: "ACTIVE",
          }))
        );
        setCompTypesFromApi(true);
      })
      .catch((error) => {
        console.warn("Load compensation types failed, using local list:", error);
      });

    return () => {
      active = false;
    };
  }, []);
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [compFormData, setCompFormData] = useState({
    name: "",
    code: "",
    eligibleRoles: ["TA"],
    defaultRate: 400,
    rateType: "HOURLY",
    maxHoursPerDay: 8,
    maxHoursPerMonth: 40,
    requiredEvidence: ["ใบลงเวลาสอน (Timesheet)"],
    description: "",
    status: "ACTIVE",
  });

  // Master courses state
  const [courses, setCourses] = useState(getMasterCourses);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    term_id: "",
    course_code: "",
    course_name_th: "",
    course_name_en: "",
    section_no: "650001",
    max_hour: 45,
    rate: 600,
  });

  /*
   * ภาคการศึกษาจาก DB (ล่าสุดก่อน) สำหรับ dropdown / การ์ดภาค
   * ใช้ชุดที่ App โหลดไว้แล้ว (prop terms) — ยิง GET /api/term เองเฉพาะตอนยังไม่มี
   */
  const [fetchedTerms, setFetchedTerms] = useState([]);
  const academicTerms = appTerms.length ? appTerms : fetchedTerms;

  useEffect(() => {
    if (appTerms.length) return;
    let active = true;

    getTerms()
      .then((data) => {
        const list = Array.isArray(data?.terms) ? data.terms : [];
        if (active) setFetchedTerms(list);
      })
      .catch((error) => {
        console.warn("Load terms failed:", error);
      });

    return () => {
      active = false;
    };
  }, [appTerms.length]);

  /*
   * รายวิชา/section จริงจาก DB (GET /api/courses?all=true) แบ่งหน้าละ PAGE_SIZE
   * กรองภาค + ค้นรหัส/ชื่อวิชาที่ backend (term_id, q) เพื่อให้ค้นได้ทุกหน้า ไม่ใช่แค่หน้าที่โหลด
   * dbCourses = แถวของหน้าปัจจุบัน · null = ยังโหลดไม่ได้ → แสดงรายการในเครื่องแบบเดิม
   * โควตา/ชั่วโมง = ผลรวมจาก section_staff ของทุกคนใน section
   */
  const [dbCourses, setDbCourses] = useState(null);
  const [dbCoursesTotal, setDbCoursesTotal] = useState(0);
  const [coursesVersion, setCoursesVersion] = useState(0);
  const reloadDbCourses = () => setCoursesVersion((v) => v + 1);
  const [coursePage, setCoursePage] = useState(1);
  const [courseTermFilter, setCourseTermFilter] = useState("");
  const [courseSearch, setCourseSearch] = useState(""); // ที่พิมพ์อยู่
  const [courseQuery, setCourseQuery] = useState(""); // ที่ส่งไป backend (หน่วง 300ms)
  const [courseStaffFilter, setCourseStaffFilter] = useState("");

  // ข้อความผลการบันทึกไป DB ของแท็บข้อมูลพื้นฐาน { type: "ok" | "error", text }
  const [masterMsg, setMasterMsg] = useState(null);

  // พิมพ์ค้นหา → รอหยุดพิมพ์ก่อนค่อยยิง API แล้วกลับไปหน้า 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCourseQuery(courseSearch.trim());
      setCoursePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [courseSearch]);

  useEffect(() => {
    let active = true;
    const offset = (coursePage - 1) * PAGE_SIZE;

    getCourses(courseTermFilter, {
      all: true,
      limit: PAGE_SIZE,
      offset,
      q: courseQuery,
      staff: courseStaffFilter,
    })
      .then((data) => {
        const list = Array.isArray(data?.courses) ? data.courses : [];
        if (!active) return;

        const { rows, total } = toPage(
          data,
          list,
          offset,
          (c) =>
            matchesCourse(c, courseQuery) &&
            matchesStaffFilter(
              { staff_count: c.staff_count, max_hour: c.section_max_hour, hour: c.section_used_hour },
              courseStaffFilter
            )
        );

        // ลบแถวสุดท้ายของหน้าสุดท้าย → หน้านั้นว่าง ถอยไปหน้าก่อนหน้า
        if (!rows.length && total > 0 && coursePage > 1) {
          setCoursePage(Math.ceil(total / PAGE_SIZE));
          return;
        }

        setDbCoursesTotal(total);
        setDbCourses(
          rows.map((c) => ({
            section_id: c.section_id,
            course_code: c.course_code,
            course_name_th: c.course_name_th,
            course_name_en: c.course_name_en,
            section_no: c.section_no,
            term_id: c.term_id,
            term_label: c.term_label,
            // รวมจาก section_staff ทุกคนใน section (Lambda รุ่นเก่าไม่ส่งมา → null)
            staff_count: c.staff_count ?? null,
            max_hour: c.section_max_hour ?? null,
            hour: c.section_used_hour ?? null,
            fromDb: true,
          }))
        );
      })
      .catch((error) => {
        console.warn("Load courses failed, using local list:", error);
      });

    return () => {
      active = false;
    };
  }, [coursesVersion, coursePage, courseTermFilter, courseQuery, courseStaffFilter]);

  /*
   * ผู้สอนประจำ section (section_staff) — แท็บย่อย "ผู้สอนประจำ section"
   * staffSectionId = section ที่เลือกดู · staffForm = ฟอร์มเพิ่ม/แก้ผู้สอน
   */
  const [staffSectionId, setStaffSectionId] = useState("");
  // dropdown section โหลดทีละภาค (ไม่ผูกกับหน้าของตารางรายวิชา) — "" = ภาคล่าสุด
  const [staffTermId, setStaffTermId] = useState("");
  const [staffSections, setStaffSections] = useState([]);
  const [sectionStaff, setSectionStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const emptyStaffForm = { user_id: "", role: "INSTRUCTOR", max_hour: 45 };
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffEditing, setStaffEditing] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);

  const loadSectionStaff = (sectionId) => {
    if (!sectionId) {
      setSectionStaff([]);
      return;
    }
    setStaffLoading(true);
    getSectionStaff(sectionId)
      .then((data) => setSectionStaff(Array.isArray(data?.staff) ? data.staff : []))
      .catch((error) => {
        setSectionStaff([]);
        setMasterMsg({ type: "error", text: `โหลดผู้สอนไม่สำเร็จ: ${error.message}` });
      })
      .finally(() => setStaffLoading(false));
  };

  // รายชื่อผู้ใช้ใช้ทั้งแท็บผู้สอนประจำ section และแท็บผู้ใช้งานและสิทธิ์ (โหมดทดลองใช้ MOCK_USERS)
  useEffect(() => {
    const needed = masterSubTab === "staff" || (activeTab === "users" && !getDevUser());
    if (!needed || adminUsers.length) return;
    getAdminUsers()
      .then((data) => setAdminUsers(Array.isArray(data?.users) ? data.users : []))
      .catch((error) => {
        setMasterMsg({ type: "error", text: `โหลดรายชื่อผู้ใช้ไม่สำเร็จ: ${error.message}` });
      });
  }, [masterSubTab, activeTab, adminUsers.length]);

  useEffect(() => {
    if (masterSubTab !== "staff") return;
    setStaffForm(emptyStaffForm);
    setStaffEditing(false);
    loadSectionStaff(staffSectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterSubTab, staffSectionId]);

  const staffTerm = staffTermId || (academicTerms[0]?.id ?? "");

  useEffect(() => {
    if (masterSubTab !== "staff" || !staffTerm) return;
    let active = true;

    getCourses(staffTerm, { all: true })
      .then((data) => {
        if (active) setStaffSections(Array.isArray(data?.courses) ? data.courses : []);
      })
      .catch((error) => {
        setMasterMsg({ type: "error", text: `โหลด section ไม่สำเร็จ: ${error.message}` });
      });

    return () => {
      active = false;
    };
  }, [masterSubTab, staffTerm, coursesVersion]);

  const openStaffOf = (course) => {
    setStaffTermId(String(course.term_id));
    setStaffSectionId(String(course.section_id));
    setMasterSubTab("staff");
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffSaving(true);
    try {
      await saveSectionStaff({
        section_id: Number(staffSectionId),
        user_id: staffForm.user_id,
        role: staffForm.role,
        max_hour: Number(staffForm.max_hour),
      });
      setMasterMsg({ type: "ok", text: staffEditing ? "แก้ไขผู้สอนแล้ว" : "เพิ่มผู้สอนแล้ว" });
      setStaffForm(emptyStaffForm);
      setStaffEditing(false);
      loadSectionStaff(staffSectionId);
      reloadDbCourses();
    } catch (error) {
      setMasterMsg({ type: "error", text: error.message });
    } finally {
      setStaffSaving(false);
    }
  };

  const handleRemoveStaff = (member) => {
    askConfirm({
      title: "นำผู้สอนออกจาก section",
      message: `ยืนยันนำ ${member.name || member.username} ออกจาก section นี้ใช่หรือไม่?`,
      confirmText: "ยืนยันนำออก",
      onConfirm: async () => {
        try {
          await removeSectionStaff(member.section_id, member.user_id);
          setMasterMsg({ type: "ok", text: "นำผู้สอนออกแล้ว" });
          loadSectionStaff(staffSectionId);
          reloadDbCourses();
        } catch (error) {
          setMasterMsg({ type: "error", text: error.message });
        }
      },
    });
  };

  // โหลดจาก DB ไม่ได้ → รายการในเครื่อง กรอง/ตัดหน้าเองแบบเดียวกัน
  const localCoursePage = toPage(
    null,
    courses.filter((c) => !courseTermFilter || String(c.term_id) === String(courseTermFilter)),
    (coursePage - 1) * PAGE_SIZE,
    (c) => matchesCourse(c, courseQuery) && matchesStaffFilter(c, courseStaffFilter)
  );
  const courseRows = dbCourses ?? localCoursePage.rows;
  const courseTotal = dbCourses ? dbCoursesTotal : localCoursePage.total;

  const termLabelOf = (termId) => {
    const t = academicTerms.find((item) => String(item.id) === String(termId));
    return t ? t.label || `${t.semester}/${t.year}` : "";
  };

  /*
   * ภาคการศึกษา & รอบการยื่น จาก DB (GET /api/term, GET /api/period?all=true)
   * รอบการยื่นแบ่งหน้าที่ backend + กรองตามภาค (กดการ์ดภาค)
   * สถานะคำนวณจากวันที่ — โหลดไม่ได้ → ใช้รายการในเครื่องแบบเดิม
   */
  const [dbPeriods, setDbPeriods] = useState(null);
  const [dbPeriodsTotal, setDbPeriodsTotal] = useState(0);
  const [periodPage, setPeriodPage] = useState(1);
  const [periodTermFilter, setPeriodTermFilter] = useState("");

  useEffect(() => {
    let active = true;
    const offset = (periodPage - 1) * PAGE_SIZE;

    getPeriods(periodTermFilter, { all: true, limit: PAGE_SIZE, offset })
      .then((data) => {
        const list = Array.isArray(data?.periods) ? data.periods : [];
        if (!active) return;
        const { rows, total } = toPage(data, list, offset);
        setDbPeriods(rows);
        setDbPeriodsTotal(total);
      })
      .catch((error) => {
        console.warn("Load periods failed, using local list:", error);
      });

    return () => {
      active = false;
    };
  }, [periodPage, periodTermFilter]);

  const togglePeriodTerm = (termId) => {
    setPeriodTermFilter((cur) => (String(cur) === String(termId) ? "" : String(termId)));
    setPeriodPage(1);
  };

  const today = new Date().toISOString().slice(0, 10);

  const terms = academicTerms.length
    ? [...academicTerms]
        .sort((a, b) => a.year - b.year || a.semester - b.semester)
        .map((t) => {
          const start = String(t.start_date).slice(0, 10);
          const end = String(t.end_date).slice(0, 10);
          return {
            ...t,
            start_date: start,
            end_date: end,
            status: today < start ? "UPCOMING" : today > end ? "CLOSED" : "ACTIVE",
          };
        })
    : getMasterTerms();

  const periods = dbPeriods
    ? dbPeriods.map((p) => {
        const now = Date.now();
        // open_at ของรอบเดือน 12 อยู่ต้นปีถัดไป → ปีของรอบ = ปีที่เปิด − 1
        const openYear = new Date(p.open_at).getFullYear();
        const year = openYear - (p.month > new Date(p.open_at).getMonth() + 1 ? 1 : 0) + 543;
        return {
          ...p,
          label: `รอบ${THAI_MONTHS[p.month - 1] || p.month} ${year}`,
          state: p.is_open_now
            ? "OPEN"
            : new Date(p.open_at).getTime() > now
              ? "UPCOMING"
              : "CLOSED",
        };
      })
    : getMasterPeriods().map((p) => ({ ...p, state: p.status === 1 ? "OPEN" : "CLOSED" }));
  const localPeriods = dbPeriods
    ? []
    : periods.filter((p) => !periodTermFilter || String(p.term_id) === periodTermFilter);
  const periodRows = dbPeriods
    ? periods
    : localPeriods.slice((periodPage - 1) * PAGE_SIZE, periodPage * PAGE_SIZE);
  const periodTotal = dbPeriods ? dbPeriodsTotal : localPeriods.length;

  // Users state
  // ผู้ใช้จำลองแสดงเฉพาะโหมดทดลอง — ล็อกอินจริงยังไม่มี API รายชื่อผู้ใช้
  const [usersList, setUsersList] = useState(() => (getDevUser() ? MOCK_USERS : []));
  const [userRoleModal, setUserRoleModal] = useState(null); // selected user
  const [showMatrix, setShowMatrix] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Data Exchange state
  const [importLogs, setImportLogs] = useState(getImportLogs);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");
  const [csvPreview, setCsvPreview] = useState(null);

  // Financial & Budget calculation (FR9)
  const budgetStats = useMemo(() => {
    const totalAllocated = Number(rules.annualBudget || 2500000);
    const sum = (list) => list.reduce((s, c) => s + Number(c.amount || 0), 0);

    const paidClaims = claims.filter((c) => c.status === "Paid");
    const approvedClaims = claims.filter((c) => c.status === "Approved");
    const inReviewClaims = claims.filter((c) => ["Submitted", "Reviewed"].includes(c.status));

    const paidAmount = sum(paidClaims);
    const approvedAmount = sum(approvedClaims);
    const inReviewAmount = sum(inReviewClaims);
    const totalCommitted = paidAmount + approvedAmount;
    const remainingBudget = Math.max(0, totalAllocated - totalCommitted);
    const percentUsed = totalAllocated > 0 ? Math.min(100, Math.round((totalCommitted / totalAllocated) * 100)) : 0;

    return {
      totalAllocated,
      paidAmount,
      approvedAmount,
      inReviewAmount,
      totalCommitted,
      remainingBudget,
      percentUsed,
      totalClaims: claims.length,
      paidCount: paidClaims.length,
      approvedCount: approvedClaims.length,
      inReviewCount: inReviewClaims.length,
    };
  }, [claims, rules.annualBudget]);

  // Handlers for Rules
  const handleSaveRules = (e) => {
    e.preventDefault();
    saveSystemRules(rules);
    setRulesSavedMsg("บันทึกการตั้งค่ากฎและเงื่อนไขเรียบร้อยแล้ว");
    setTimeout(() => setRulesSavedMsg(""), 3500);
  };

  // Handlers for Compensation Types
  const handleOpenCompModal = (type = null) => {
    if (type) {
      setEditingComp(type);
      setCompFormData({
        name: type.name || "",
        code: type.code || "",
        eligibleRoles: type.eligibleRoles || ["TA"],
        defaultRate: type.defaultRate || 400,
        rateType: type.rateType || "HOURLY",
        maxHoursPerDay: type.maxHoursPerDay || 8,
        maxHoursPerMonth: type.maxHoursPerMonth || 40,
        requiredEvidence: type.requiredEvidence || ["ใบลงเวลาสอน (Timesheet)"],
        description: type.description || "",
        status: type.status || "ACTIVE",
      });
    } else {
      setEditingComp(null);
      setCompFormData({
        name: "",
        code: `TYPE-${Date.now().toString().slice(-4)}`,
        eligibleRoles: ["TA"],
        defaultRate: 400,
        rateType: "HOURLY",
        maxHoursPerDay: 8,
        maxHoursPerMonth: 40,
        requiredEvidence: ["ใบลงเวลาสอน (Timesheet)"],
        description: "",
        status: "ACTIVE",
      });
    }
    setCompModalOpen(true);
  };

  const handleSaveCompType = (e) => {
    e.preventDefault();
    const payload = {
      ...(editingComp || {}),
      ...compFormData,
      id: editingComp ? editingComp.id : `COMP_${Date.now()}`,
    };
    const updated = saveCompensationType(payload);
    setCompTypes(updated);
    setCompModalOpen(false);
  };

  const handleDeleteComp = (id) => {
    askConfirm({
      title: "ลบ/ปิดใช้งานประเภทค่าตอบแทน",
      message: "ยืนยันที่จะปิดใช้งานหรือลบประเภทค่าตอบแทนนี้ใช่หรือไม่?",
      confirmText: "ยืนยันลบ",
      onConfirm: () => {
        const updated = deleteCompensationType(id);
        setCompTypes(updated);
      },
    });
  };

  // Handlers for Courses
  const handleOpenCourseModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setCourseFormData({
        term_id: course.term_id ?? "",
        course_code: course.course_code || "",
        course_name_th: course.course_name_th || "",
        course_name_en: course.course_name_en || "",
        section_no: course.section_no || "650001",
        max_hour: course.max_hour || 45,
        rate: course.rate || 600,
      });
    } else {
      setEditingCourse(null);
      setCourseFormData({
        // ค่าเริ่มต้น = ภาคล่าสุด
        term_id: academicTerms[0]?.id ?? "",
        course_code: "",
        course_name_th: "",
        course_name_en: "",
        section_no: "650001",
        max_hour: 45,
        rate: 600,
      });
    }
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();

    // โหลดจาก DB ได้ → เพิ่ม section ลง DB (โควตาชั่วโมงกำหนดรายคนที่แท็บผู้สอน)
    if (dbCourses && !editingCourse) {
      try {
        const result = await createSection({
          course_code: courseFormData.course_code.trim(),
          course_name_th: courseFormData.course_name_th.trim(),
          course_name_en: courseFormData.course_name_en.trim(),
          term_id: Number(courseFormData.term_id),
          section_no: courseFormData.section_no.trim(),
        });
        setCourseModalOpen(false);
        setMasterMsg({
          type: "ok",
          text: `เพิ่ม ${courseFormData.course_code} กลุ่ม ${courseFormData.section_no} แล้ว — กำหนดผู้สอนต่อได้ที่แท็บ "ผู้สอนประจำ section"`,
        });
        reloadDbCourses();
        if (result?.section_id) setStaffSectionId(String(result.section_id));
      } catch (error) {
        setMasterMsg({ type: "error", text: error.message });
        setCourseModalOpen(false);
      }
      return;
    }

    const payload = {
      ...(editingCourse || {}),
      ...courseFormData,
      term_id: courseFormData.term_id === "" ? null : Number(courseFormData.term_id),
      term_label: termLabelOf(courseFormData.term_id),
      section_id: editingCourse?.section_id || Date.now(),
      status: "ACTIVE",
    };
    const updated = saveMasterCourse(payload);
    setCourses(updated);
    setCourseModalOpen(false);
  };

  const handleDeleteCourse = (sectionId, fromDb = false) => {
    askConfirm({
      title: "ลบรายวิชา",
      message: fromDb
        ? "ยืนยันลบ section นี้ออกจาก DB? ผู้สอนใน section จะถูกนำออกด้วย (ลบไม่ได้ถ้ามีคำขอเบิกแล้ว)"
        : "ยืนยันที่จะลบรายวิชานี้ใช่หรือไม่?",
      confirmText: "ยืนยันลบ",
      onConfirm: async () => {
        if (fromDb) {
          try {
            await deleteSection(sectionId);
            setMasterMsg({ type: "ok", text: "ลบ section แล้ว" });
            reloadDbCourses();
          } catch (error) {
            setMasterMsg({ type: "error", text: error.message });
          }
          return;
        }
        const updated = deleteMasterCourse(sectionId);
        setCourses(updated);
      },
    });
  };

  // Handlers for External Sync (FR10)
  const handleSyncTU = () => {
    setSyncing(true);
    setTimeout(() => {
      const updatedCourses = getMasterCourses();
      setCourses(updatedCourses);
      const newLogs = addImportLog({
        source: "TU Registrar API (ระบบทะเบียนกลางมหาวิทยาลัย)",
        recordsCount: updatedCourses.length,
        type: "COURSES & ASSIGNMENTS",
        status: "SUCCESS",
        actor: user?.name || "ผู้ดูแลระบบ",
        details: `เชื่อมต่อและปรับปรุงข้อมูลรายวิชาและผู้ช่วยสอนสำเร็จ (${updatedCourses.length} รายการ)`,
      });
      setImportLogs(newLogs);
      setSyncing(false);
      setSyncSuccessMsg("เชื่อมต่อและปรับปรุงข้อมูลจากระบบทะเบียนมหาวิทยาลัยสำเร็จแล้ว");
      setTimeout(() => setSyncSuccessMsg(""), 4000);
    }, 1200);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate CSV parsing
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      setCsvPreview({
        fileName: file.name,
        rows: [
          { code: "CS101", name: "Fundamental Computer Programming", sec: "650001", hours: 45, rate: 600 },
          { code: "CS213", name: "Data Structures", sec: "650001", hours: 45, rate: 600 },
          { code: "CS341", name: "Software Engineering", sec: "650001", hours: 45, rate: 600 },
          { code: "CS361", name: "Cloud-Based Software Architecture", sec: "650001", hours: 45, rate: 600 },
        ],
      });
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = () => {
    if (!csvPreview) return;
    const newLogs = addImportLog({
      source: `CSV Upload (${csvPreview.fileName})`,
      recordsCount: csvPreview.rows.length,
      type: "IMPORT_CSV",
      status: "SUCCESS",
      actor: user?.name || "ผู้ดูแลระบบ",
      details: `นำเข้าข้อมูลจากไฟล์ ${csvPreview.fileName} จำนวน ${csvPreview.rows.length} รายการสำเร็จ`,
    });
    setImportLogs(newLogs);
    setCsvPreview(null);
    setSyncSuccessMsg("นำเข้าข้อมูลจากไฟล์ CSV สำเร็จและบันทึกประวัติการแลกเปลี่ยนข้อมูลแล้ว");
    setTimeout(() => setSyncSuccessMsg(""), 4000);
  };

  // Handlers for User Role Assignment (FR5)
  const handleChangeUserRole = (userObj, newRole) => {
    setUsersList((prev) =>
      prev.map((u) => (u.username === userObj.username ? { ...u, role: newRole } : u))
    );
    setUserRoleModal(null);
  };

  /*
   * ล็อกอินจริง → ผู้ใช้จาก app_user (GET /api/admin/users)
   * บทบาทแสดงจาก section_staff (อาจารย์/TA) เพราะกลุ่ม Cognito ไม่ได้เก็บใน DB
   * ส่วนผู้ตรวจสอบ/ผู้อนุมัติ/ผู้ดูแลจึงขึ้นเป็น "ไม่ได้สอน section ใด"
   */
  const isDevMode = Boolean(getDevUser());
  const displayUsers = useMemo(() => {
    if (isDevMode) return usersList;
    return adminUsers.map((u) => {
      const roles = (u.staff_roles || []).map((r) =>
        r === "TA" ? "ผู้ช่วยสอน (TA)" : r === "INSTRUCTOR" ? "อาจารย์ผู้สอน" : r
      );
      return {
        userId: u.user_id,
        username: u.username,
        email: u.username?.includes("@") ? u.username : "-",
        name: u.name,
        role: roles.length ? roles.join(", ") : "",
        sectionCount: u.section_count ?? 0,
        fromDb: true,
      };
    });
  }, [isDevMode, usersList, adminUsers]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return displayUsers;
    const q = userSearch.toLowerCase();
    return displayUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [displayUsers, userSearch]);

  const TABS = [
    { id: "overview", label: "ภาพรวม & งบประมาณ", icon: Wallet, fr: "FR9" },
    { id: "compTypes", label: "ประเภทค่าตอบแทน", icon: Layers, fr: "FR2" },
    { id: "masterData", label: "ข้อมูลพื้นฐาน (รายวิชา/รอบ)", icon: Database, fr: "FR3" },
    { id: "rules", label: "กฎและเงื่อนไข", icon: Sliders, fr: "FR4" },
    { id: "users", label: "ผู้ใช้งานและสิทธิ์", icon: Users, fr: "FR5" },
    { id: "dataExchange", label: "นำเข้า/แลกเปลี่ยนข้อมูล", icon: RefreshCw, fr: "FR10" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={ShieldCheck}
        title="ศูนย์จัดการระบบสำหรับผู้ดูแลระบบ"
        description="จัดการข้อมูลพื้นฐาน, ประเภทค่าตอบแทน, กฎและเงื่อนไข, สิทธิ์ผู้ใช้งาน, การเงินและงบประมาณ, และการแลกเปลี่ยนข้อมูลภายนอก"
      />

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3" style={{ borderColor: C.border }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                active
                  ? "text-white shadow-md shadow-teal-700/20"
                  : "bg-white hover:bg-slate-50 border text-slate-700"
              }`}
              style={{
                background: active ? `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` : undefined,
                borderColor: active ? "transparent" : C.border,
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB 1: ภาพรวม & บริหารงบประมาณ (Overview & Budget - FR9)
          ========================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Budget KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border shadow-sm" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>งบประมาณจัดสรรประจำปี</span>
                <Wallet size={16} style={{ color: C.teal }} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 figure">
                {baht(budgetStats.totalAllocated)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">ปีการศึกษา {rules.currentAcademicYear}</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border shadow-sm" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>ยอดจ่ายเงินแล้ว (Paid)</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-700 figure">
                {baht(budgetStats.paidAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{budgetStats.paidCount} คำขอที่โอนเงินแล้ว</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border shadow-sm" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>อนุมัติรอจ่าย (Approved)</span>
                <Clock size={16} className="text-purple-600" />
              </div>
              <p className="text-2xl font-extrabold text-purple-700 figure">
                {baht(budgetStats.approvedAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{budgetStats.approvedCount} คำขอรอรอบการเงิน</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border shadow-sm" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>งบประมาณคงเหลือสุทธิ</span>
                <DollarSign size={16} style={{ color: C.ember }} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 figure">
                {baht(budgetStats.remainingBudget)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                คงเหลือ {100 - budgetStats.percentUsed}% ของงบประมาณ
              </p>
            </div>
          </div>

          {/* Budget Utilization Meter */}
          <SectionCard hoverable={false} className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>สถานะการเบิกจ่ายงบประมาณเทียบเพดานจัดสรร</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      budgetStats.percentUsed > rules.budgetAlertThresholdPercent
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    ใช้ไป {budgetStats.percentUsed}%
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  รวมยอดจ่ายจริง + ยอดอนุมัติรอจ่าย = {baht(budgetStats.totalCommitted)} (จากทั้งหมด {baht(budgetStats.totalAllocated)})
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (budgetStats.paidAmount / budgetStats.totalAllocated) * 100)}%` }}
                title={`จ่ายแล้ว: ${baht(budgetStats.paidAmount)}`}
              />
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (budgetStats.approvedAmount / budgetStats.totalAllocated) * 100)}%` }}
                title={`อนุมัติรอจ่าย: ${baht(budgetStats.approvedAmount)}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                จ่ายแล้ว ({baht(budgetStats.paidAmount)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                อนุมัติรอจ่าย ({baht(budgetStats.approvedAmount)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" />
                งบประมาณคงเหลือ ({baht(budgetStats.remainingBudget)})
              </span>
            </div>
          </SectionCard>

          {/* Quick Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab("compTypes")}
              className="p-5 bg-white rounded-3xl border text-left hover:border-teal-500 transition-all group"
              style={{ borderColor: C.border }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 text-teal-700 bg-teal-50 group-hover:scale-105 transition-transform">
                <Layers size={20} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                จัดการประเภทค่าตอบแทน
                <ArrowRight size={15} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">กำหนดอัตราต่อชั่วโมง เอกสารหลักฐานบังคับ และบทบาทผู้มีสิทธิ์</p>
            </button>

            <button
              onClick={() => setActiveTab("masterData")}
              className="p-5 bg-white rounded-3xl border text-left hover:border-teal-500 transition-all group"
              style={{ borderColor: C.border }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 text-teal-700 bg-teal-50 group-hover:scale-105 transition-transform">
                <Database size={20} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                จัดการข้อมูลรายวิชา & รอบ
                <ArrowRight size={15} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">กำหนดโควตาชั่วโมง ผู้สอน ผู้ช่วยสอน TA และวันเปิด-ปิดรอบการยื่น</p>
            </button>

            <button
              onClick={() => setActiveTab("dataExchange")}
              className="p-5 bg-white rounded-3xl border text-left hover:border-teal-500 transition-all group"
              style={{ borderColor: C.border }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 text-teal-700 bg-teal-50 group-hover:scale-105 transition-transform">
                <RefreshCw size={20} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                แลกเปลี่ยน & นำเข้าข้อมูล
                <ArrowRight size={15} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">ซิงก์ข้อมูลจากระบบทะเบียน TU Registrar หรือนำเข้าผ่าน CSV</p>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: ประเภทค่าตอบแทน (Compensation Types - FR2)
          ========================================================= */}
      {activeTab === "compTypes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ประเภทค่าตอบแทนในระบบ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {compTypesFromApi
                  ? "ข้อมูลจากฐานข้อมูล (ตาราง compensation_type) — ดูได้อย่างเดียว ยังไม่มี API เพิ่ม/แก้ไข/ลบ"
                  : "รองรับการกำหนดประเภทค่าตอบแทน อัตราต่อชั่วโมง เอกสารหลักฐานที่ต้องแนบ และรองรับประเภทใหม่ในอนาคต"}
              </p>
            </div>
            {!compTypesFromApi && (
            <button
              type="button"
              onClick={() => handleOpenCompModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
              style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
            >
              <Plus size={16} />
              <span>เพิ่มประเภทค่าตอบแทนใหม่</span>
            </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {compTypes.map((type) => (
              <SectionCard key={type.id} hoverable={false} className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {type.code || type.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            type.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {type.status === "ACTIVE" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 mt-2">
                        {type.name}
                      </h4>
                    </div>

                    <div className={`flex items-center gap-1 ${compTypesFromApi ? "hidden" : ""}`}>
                      <button
                        type="button"
                        onClick={() => handleOpenCompModal(type)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600"
                        title="แก้ไข"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComp(type.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 text-rose-600"
                        title="ลบ / ปิดการใช้งาน"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {type.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                  </p>

                  <div className="space-y-2 text-xs border-t pt-3" style={{ borderColor: C.border }}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">อัตราค่าตอบแทน:</span>
                      <span className="font-extrabold text-teal-800 text-sm">
                        ฿{type.defaultRate} / ชั่วโมง
                      </span>
                    </div>

                    {/* ผู้มีสิทธิ์ / เพดาน / หลักฐาน มีเฉพาะประเภทในเครื่อง — ตารางใน DB ยังไม่มี */}
                    {!compTypesFromApi && (
                    <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">ผู้มีสิทธิ์เบิก:</span>
                      <div className="flex gap-1">
                        {(type.eligibleRoles || []).map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700"
                          >
                            {r === "TEACHER" ? "อาจารย์ผู้สอน" : r === "TA" ? "ผู้ช่วยสอน (TA)" : r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">เพดานชั่วโมงสูงสุด:</span>
                      <span className="font-semibold text-slate-800">
                        ไม่เกิน {type.maxHoursPerMonth || 40} ชม./เดือน
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-slate-500 block mb-1">เอกสารหลักฐานที่ต้องแนบ:</span>
                      <div className="flex flex-wrap gap-1">
                        {(type.requiredEvidence || []).map((ev, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-medium"
                          >
                            <FileText size={11} />
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}

      {/* Modal: เพิ่ม/แก้ไขประเภทค่าตอบแทน */}
      {compModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">
                {editingComp ? "แก้ไขประเภทค่าตอบแทน" : "เพิ่มประเภทค่าตอบแทนใหม่"}
              </h3>
              <button
                onClick={() => setCompModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCompType} className="space-y-4 text-sm">
              <Field label="ชื่อประเภทค่าตอบแทน" required>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าตอบแทนผู้ช่วยตรวจการบ้าน (TA Grading)"
                  value={compFormData.name}
                  onChange={(e) => setCompFormData({ ...compFormData, name: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="รหัสย่อประเภท" required>
                  <input
                    type="text"
                    required
                    placeholder="เช่น TA-GRADE"
                    value={compFormData.code}
                    onChange={(e) => setCompFormData({ ...compFormData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-mono"
                    style={{ borderColor: C.border }}
                  />
                </Field>

                <Field label="อัตราค่าตอบแทน (บาท/ชม.)" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={compFormData.defaultRate}
                    onChange={(e) => setCompFormData({ ...compFormData, defaultRate: Number(e.target.value) })}
                    className="w-full rounded-xl border px-3.5 py-2.5 outline-none figure font-bold"
                    style={{ borderColor: C.border }}
                  />
                </Field>
              </div>

              <Field label="บทบาทผู้มีสิทธิ์เบิก">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={compFormData.eligibleRoles.includes("TEACHER")}
                      onChange={(e) => {
                        const roles = e.target.checked
                          ? [...compFormData.eligibleRoles, "TEACHER"]
                          : compFormData.eligibleRoles.filter((r) => r !== "TEACHER");
                        setCompFormData({ ...compFormData, eligibleRoles: roles });
                      }}
                    />
                    อาจารย์ผู้สอน (TEACHER)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={compFormData.eligibleRoles.includes("TA")}
                      onChange={(e) => {
                        const roles = e.target.checked
                          ? [...compFormData.eligibleRoles, "TA"]
                          : compFormData.eligibleRoles.filter((r) => r !== "TA");
                        setCompFormData({ ...compFormData, eligibleRoles: roles });
                      }}
                    />
                    ผู้ช่วยสอน (TA)
                  </label>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="เพดานสูงสุดต่อวัน (ชม.)">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={compFormData.maxHoursPerDay}
                    onChange={(e) => setCompFormData({ ...compFormData, maxHoursPerDay: Number(e.target.value) })}
                    className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                    style={{ borderColor: C.border }}
                  />
                </Field>

                <Field label="เพดานสูงสุดต่อเดือน (ชม.)">
                  <input
                    type="number"
                    min="1"
                    value={compFormData.maxHoursPerMonth}
                    onChange={(e) => setCompFormData({ ...compFormData, maxHoursPerMonth: Number(e.target.value) })}
                    className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                    style={{ borderColor: C.border }}
                  />
                </Field>
              </div>

              <Field label="เอกสารหลักฐานที่ต้องแนบ (คั่นด้วยเครื่องหมายจุลภาค ,)">
                <input
                  type="text"
                  placeholder="ใบลงเวลาสอน, ตารางสอน, ใบรับรองผลงาน"
                  value={compFormData.requiredEvidence.join(", ")}
                  onChange={(e) =>
                    setCompFormData({
                      ...compFormData,
                      requiredEvidence: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <Field label="คำอธิบายและเงื่อนไข">
                <textarea
                  rows={2}
                  placeholder="ระบุข้อกำหนดเฉพาะสำหรับประเภทค่าตอบแทนนี้..."
                  value={compFormData.description}
                  onChange={(e) => setCompFormData({ ...compFormData, description: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none resize-none"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setCompModalOpen(false)}
                  className="px-4 py-2.5 rounded-full font-semibold border text-slate-700 hover:bg-slate-50"
                  style={{ borderColor: C.border }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full font-bold text-white shadow-sm"
                  style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
                >
                  บันทึกประเภทค่าตอบแทน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: ข้อมูลพื้นฐาน (Master Data: รายวิชา & รอบ - FR3)
          ========================================================= */}
      {activeTab === "masterData" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMasterSubTab("courses")}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  masterSubTab === "courses"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border text-slate-700 hover:bg-slate-50"
                }`}
                style={{ borderColor: C.border }}
              >
                รายวิชาและการจัดสรร ({courseTotal})
              </button>
              <button
                type="button"
                onClick={() => setMasterSubTab("terms")}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  masterSubTab === "terms"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border text-slate-700 hover:bg-slate-50"
                }`}
                style={{ borderColor: C.border }}
              >
                ภาคการศึกษา & รอบการยื่น
              </button>
              {dbCourses && (
                <button
                  type="button"
                  onClick={() => setMasterSubTab("staff")}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    masterSubTab === "staff"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white border text-slate-700 hover:bg-slate-50"
                  }`}
                  style={{ borderColor: C.border }}
                >
                  ผู้สอนประจำ section
                </button>
              )}
            </div>

            {masterSubTab === "courses" && (
              <button
                type="button"
                onClick={() => handleOpenCourseModal()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white shadow-sm"
                style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
              >
                <Plus size={16} />
                <span>{dbCourses ? "เพิ่ม section ใหม่" : "เพิ่มรายวิชาใหม่"}</span>
              </button>
            )}
          </div>

          {masterMsg && (
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-sm font-semibold ${
                masterMsg.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span>{masterMsg.text}</span>
              <button type="button" onClick={() => setMasterMsg(null)} className="shrink-0">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Subtab Courses */}
          {masterSubTab === "courses" && (
            <SectionCard hoverable={false} className="p-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-b" style={{ borderColor: C.border }}>
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="ค้นหารหัสหรือชื่อวิชา"
                    className="w-full rounded-xl border pl-9 pr-3.5 py-2 text-sm outline-none"
                    style={{ borderColor: C.border }}
                  />
                </div>
                <Select
                  value={courseTermFilter}
                  onChange={(e) => {
                    setCourseTermFilter(e.target.value);
                    setCoursePage(1);
                  }}
                  className="sm:w-48 rounded-xl border px-3.5 py-2 text-sm outline-none"
                  style={{ borderColor: C.border }}
                >
                  <option value="">ทุกภาคการศึกษา</option>
                  {academicTerms.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      ภาค {t.label || `${t.semester}/${t.year}`}
                    </option>
                  ))}
                </Select>
                <Select
                  value={courseStaffFilter}
                  onChange={(e) => {
                    setCourseStaffFilter(e.target.value);
                    setCoursePage(1);
                  }}
                  className="sm:w-48 rounded-xl border px-3.5 py-2 text-sm outline-none"
                  style={{ borderColor: C.border }}
                >
                  {STAFF_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                {(courseSearch || courseTermFilter || courseStaffFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCourseSearch("");
                      setCourseQuery("");
                      setCourseTermFilter("");
                      setCourseStaffFilter("");
                      setCoursePage(1);
                    }}
                    className="shrink-0 flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    <X size={14} />
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr style={{ background: "#F6F9FB", color: C.ink }}>
                      <th className="text-left px-5 py-3 font-semibold">รหัสวิชา</th>
                      <th className="text-left px-4 py-3 font-semibold">ภาค</th>
                      <th className="text-left px-4 py-3 font-semibold">ชื่อรายวิชา</th>
                      <th className="text-left px-4 py-3 font-semibold">กลุ่ม (Sec)</th>
                      <th className="text-center px-4 py-3 font-semibold">ผู้สอน</th>
                      <th className="text-center px-4 py-3 font-semibold">โควตาชั่วโมง</th>
                      <th className="text-center px-4 py-3 font-semibold">ชั่วโมงที่ใช้ไป</th>
                      <th className="text-right px-5 py-3 font-semibold">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: C.border }}>
                    {courseRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                          {courseQuery || courseTermFilter || courseStaffFilter
                            ? "ไม่พบรายวิชาที่ตรงกับเงื่อนไข"
                            : "ยังไม่มีรายวิชา"}
                        </td>
                      </tr>
                    )}
                    {courseRows.map((course) => (
                      <tr key={course.section_id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-extrabold text-teal-800">
                          {course.course_code}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 figure">
                          {course.term_label || termLabelOf(course.term_id) || "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{course.course_name_th}</p>
                          {course.course_name_en && (
                            <p className="text-xs text-slate-500">{course.course_name_en}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-mono">
                          {course.section_no || "650001"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-600 figure">
                          {course.staff_count != null ? `${course.staff_count} คน` : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-800 figure">
                          {course.max_hour != null
                            ? `${course.max_hour} ชม.`
                            : course.fromDb
                              ? "-"
                              : "45 ชม."}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-600 figure">
                          {course.hour != null
                            ? `${course.hour} ชม.`
                            : course.fromDb
                              ? "-"
                              : "0 ชม."}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {course.fromDb ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openStaffOf(course)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                                title="จัดการผู้สอน"
                              >
                                <Users size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(course.section_id, true)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 text-rose-600"
                                title="ลบ section"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenCourseModal(course)}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                              title="แก้ไข"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.section_id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 text-rose-600"
                              title="ลบ"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={coursePage} total={courseTotal} onChange={setCoursePage} />
            </SectionCard>
          )}

          {/* Subtab ผู้สอนประจำ section (section_staff) */}
          {masterSubTab === "staff" && dbCourses && (() => {
            const found = staffSections.find((c) => String(c.section_id) === staffSectionId);
            const selected = found && {
              staff_count: found.staff_count,
              max_hour: found.section_max_hour,
              hour: found.section_used_hour,
            };
            const usedInSection = new Set(sectionStaff.map((s) => s.user_id));
            const editingMember = staffEditing
              ? sectionStaff.find((s) => s.user_id === staffForm.user_id)
              : null;

            return (
              <div className="space-y-6">
                <SectionCard hoverable={false} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-3">
                    <Field label="ภาคการศึกษา" required>
                      <Select
                        value={String(staffTerm)}
                        onChange={(e) => {
                          setStaffTermId(e.target.value);
                          setStaffSectionId("");
                        }}
                        className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                        style={{ borderColor: C.border }}
                      >
                        {academicTerms.map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            ภาค {t.label || `${t.semester}/${t.year}`}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="เลือก section" required>
                      <Select
                        value={staffSectionId}
                        onChange={(e) => setStaffSectionId(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                        style={{ borderColor: C.border }}
                      >
                        <option value="" disabled>
                          {staffSections.length ? "เลือกรายวิชา / กลุ่ม" : "ภาคนี้ยังไม่มี section"}
                        </option>
                        {staffSections.map((c) => (
                          <option key={c.section_id} value={String(c.section_id)}>
                            {c.course_code} {c.course_name_th} · กลุ่ม {c.section_no}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  {selected && (
                    <p className="text-xs text-slate-500">
                      รวมทั้ง section: {selected.staff_count ?? 0} คน · โควตา {selected.max_hour ?? 0} ชม. ·
                      ใช้ไป {selected.hour ?? 0} ชม.
                    </p>
                  )}
                </SectionCard>

                {staffSectionId && (
                  <SectionCard hoverable={false} className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr style={{ background: "#F6F9FB", color: C.ink }}>
                            <th className="text-left px-5 py-3 font-semibold">ผู้สอน</th>
                            <th className="text-left px-4 py-3 font-semibold">บทบาท</th>
                            <th className="text-center px-4 py-3 font-semibold">โควตาชั่วโมง</th>
                            <th className="text-center px-4 py-3 font-semibold">ชั่วโมงที่ใช้ไป</th>
                            <th className="text-right px-5 py-3 font-semibold">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: C.border }}>
                          {staffLoading ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                                กำลังโหลด...
                              </td>
                            </tr>
                          ) : sectionStaff.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                                ยังไม่มีผู้สอนใน section นี้
                              </td>
                            </tr>
                          ) : (
                            sectionStaff.map((s) => (
                              <tr key={s.user_id} className="hover:bg-slate-50/60">
                                <td className="px-5 py-3.5">
                                  <p className="font-semibold text-slate-900">{s.name}</p>
                                  <p className="text-xs text-slate-500">{s.username}</p>
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  {s.role === "TA" ? "ผู้ช่วยสอน (TA)" : "อาจารย์ผู้สอน"}
                                </td>
                                <td className="px-4 py-3.5 text-center font-bold text-slate-800 figure">
                                  {s.max_hour} ชม.
                                </td>
                                <td className="px-4 py-3.5 text-center font-semibold text-slate-600 figure">
                                  {s.hour} ชม.
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setStaffEditing(true);
                                        setStaffForm({ user_id: s.user_id, role: s.role, max_hour: s.max_hour });
                                      }}
                                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                                      title="แก้ไข"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveStaff(s)}
                                      disabled={s.hour > 0}
                                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      title={s.hour > 0 ? "มีชั่วโมงที่เบิกแล้ว นำออกไม่ได้" : "นำออก"}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {staffSectionId && (
                  <SectionCard hoverable={false} className="p-6">
                    <h4 className="font-bold text-base text-slate-900 mb-4">
                      {staffEditing ? "แก้ไขผู้สอน" : "เพิ่มผู้สอนใน section นี้"}
                    </h4>
                    <form onSubmit={handleSaveStaff} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-sm">
                      <Field label="ผู้สอน" required>
                        <Select
                          required
                          disabled={staffEditing}
                          value={staffForm.user_id}
                          onChange={(e) => setStaffForm({ ...staffForm, user_id: e.target.value })}
                          className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                          style={{ borderColor: C.border }}
                        >
                          <option value="" disabled>
                            {adminUsers.length === 0 ? "กำลังโหลดรายชื่อ..." : "เลือกผู้ใช้"}
                          </option>
                          {editingMember && (
                            <option value={editingMember.user_id}>
                              {editingMember.name} ({editingMember.username})
                            </option>
                          )}
                          {adminUsers
                            .filter((u) => !usedInSection.has(u.user_id))
                            .map((u) => (
                              <option key={u.user_id} value={u.user_id}>
                                {u.name} ({u.username})
                              </option>
                            ))}
                        </Select>
                      </Field>

                      <Field label="บทบาท" required>
                        <Select
                          value={staffForm.role}
                          onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                          className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                          style={{ borderColor: C.border }}
                        >
                          <option value="INSTRUCTOR">อาจารย์ผู้สอน</option>
                          <option value="TA">ผู้ช่วยสอน (TA)</option>
                        </Select>
                      </Field>

                      <Field label="โควตาชั่วโมง (ชม.)" required>
                        <input
                          type="number"
                          min={editingMember?.hour || 0}
                          step="0.5"
                          required
                          value={staffForm.max_hour}
                          onChange={(e) => setStaffForm({ ...staffForm, max_hour: e.target.value })}
                          className="w-full rounded-xl border px-3.5 py-2.5 outline-none figure font-bold"
                          style={{ borderColor: C.border }}
                        />
                      </Field>

                      <div className="flex gap-2">
                        {staffEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setStaffEditing(false);
                              setStaffForm(emptyStaffForm);
                            }}
                            className="px-4 py-2.5 rounded-full font-semibold border text-slate-700 hover:bg-slate-50"
                            style={{ borderColor: C.border }}
                          >
                            ยกเลิก
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={staffSaving}
                          className="flex-1 px-5 py-2.5 rounded-full font-bold text-white shadow-sm disabled:opacity-60"
                          style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
                        >
                          {staffSaving ? "กำลังบันทึก..." : staffEditing ? "บันทึก" : "เพิ่มผู้สอน"}
                        </button>
                      </div>
                    </form>
                  </SectionCard>
                )}
              </div>
            );
          })()}

          {/* Subtab Terms & Periods */}
          {masterSubTab === "terms" && (
            <div className="space-y-6">
              <SectionCard hoverable={false} className="p-6">
                <h4 className="font-bold text-base text-slate-900 mb-1">ภาคการศึกษา (Academic Terms)</h4>
                <p className="text-xs text-slate-500 mb-3">กดที่ภาคเพื่อดูเฉพาะรอบการยื่นของภาคนั้น กดอีกครั้งเพื่อดูทั้งหมด</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {terms.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => togglePeriodTerm(t.id)}
                      aria-pressed={String(periodTermFilter) === String(t.id)}
                      className={`text-left p-4 rounded-2xl border transition-all hover:shadow-sm ${
                        t.status === "ACTIVE" ? "bg-teal-50/50 border-teal-300" : "bg-white border-slate-200"
                      } ${String(periodTermFilter) === String(t.id) ? "ring-2 ring-slate-900 ring-offset-1" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-base text-slate-900">{t.semester}/{t.year}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === "ACTIVE"
                              ? "bg-teal-600 text-white"
                              : t.status === "UPCOMING"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {t.status === "ACTIVE" ? "ภาคปัจจุบัน" : t.status === "UPCOMING" ? "ยังไม่เริ่ม" : "ปิดรอบแล้ว"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {t.start_date} ถึง {t.end_date}
                      </p>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard hoverable={false} className="p-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-6 mb-1">
                  <h4 className="font-bold text-base text-slate-900">
                    รอบการยื่นเบิกประจำภาค (Submission Periods)
                  </h4>
                  {periodTermFilter && (
                    <button
                      type="button"
                      onClick={() => togglePeriodTerm(periodTermFilter)}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 text-white"
                    >
                      ภาค {termLabelOf(periodTermFilter)}
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="divide-y px-6" style={{ borderColor: C.border }}>
                  {periodRows.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีรอบการยื่น</p>
                  )}
                  {periodRows.map((p) => (
                    <div key={p.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.label || `รอบเดือน ${p.month}`}</span>
                          {p.term_label && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 border text-slate-500">
                              ภาค {p.term_label}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              p.state === "OPEN"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.state === "UPCOMING"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {p.state === "OPEN" ? "กำลังเปิดรับคำขอ" : p.state === "UPCOMING" ? "ยังไม่เปิด" : "ปิดรับแล้ว"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          เปิด: {new Date(p.open_at).toLocaleDateString("th-TH")} — ปิด: {new Date(p.close_at).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pb-2">
                  <Pager page={periodPage} total={periodTotal} onChange={setPeriodPage} />
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      )}

      {/* Modal: เพิ่ม/แก้ไขรายวิชา */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b mb-4">
              <h3 className="font-extrabold text-lg text-slate-900">
                {editingCourse ? "แก้ไขข้อมูลรายวิชา" : dbCourses ? "เพิ่ม section ใหม่" : "เพิ่มรายวิชาใหม่"}
              </h3>
              <button
                onClick={() => setCourseModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-sm">
              <Field label="ภาคการศึกษา" required>
                <Select
                  required
                  value={courseFormData.term_id === null ? "" : String(courseFormData.term_id)}
                  onChange={(e) => setCourseFormData({ ...courseFormData, term_id: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                  style={{ borderColor: C.border }}
                >
                  <option value="" disabled>
                    {academicTerms.length === 0 ? "กำลังโหลดภาคการศึกษา..." : "เลือกภาคการศึกษา"}
                  </option>
                  {academicTerms.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      ภาค {t.label || `${t.semester}/${t.year}`}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="รหัสวิชา" required>
                <input
                  type="text"
                  required
                  placeholder="เช่น CS341"
                  value={courseFormData.course_code}
                  onChange={(e) => setCourseFormData({ ...courseFormData, course_code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-mono"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <Field label="ชื่อวิชา (ภาษาไทย)" required>
                <input
                  type="text"
                  required
                  placeholder="เช่น วิศวกรรมซอฟต์แวร์"
                  value={courseFormData.course_name_th}
                  onChange={(e) => setCourseFormData({ ...courseFormData, course_name_th: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <Field label="ชื่อวิชา (English)">
                <input
                  type="text"
                  placeholder="เช่น Software Engineering"
                  value={courseFormData.course_name_en}
                  onChange={(e) => setCourseFormData({ ...courseFormData, course_name_en: e.target.value })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none"
                  style={{ borderColor: C.border }}
                />
              </Field>

              {dbCourses && (
                <p className="text-xs text-slate-500">
                  ถ้ารหัสวิชามีอยู่แล้ว ชื่อวิชาจะถูกอัปเดตตามที่กรอก · โควตาชั่วโมงกำหนดรายคนที่แท็บ "ผู้สอนประจำ section"
                </p>
              )}

              <div className={`grid gap-3 ${dbCourses ? "grid-cols-1" : "grid-cols-2"}`}>
                <Field label="กลุ่มเรียน (Section)" required={!!dbCourses}>
                  <input
                    type="text"
                    required={!!dbCourses}
                    value={courseFormData.section_no}
                    onChange={(e) => setCourseFormData({ ...courseFormData, section_no: e.target.value })}
                    className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-mono"
                    style={{ borderColor: C.border }}
                  />
                </Field>

                {!dbCourses && (
                  <Field label="โควตาชั่วโมง (ชม.)" required>
                    <input
                      type="number"
                      min="1"
                      required
                      value={courseFormData.max_hour}
                      onChange={(e) => setCourseFormData({ ...courseFormData, max_hour: Number(e.target.value) })}
                      className="w-full rounded-xl border px-3.5 py-2.5 outline-none figure font-bold"
                      style={{ borderColor: C.border }}
                    />
                  </Field>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2.5 rounded-full font-semibold border text-slate-700 hover:bg-slate-50"
                  style={{ borderColor: C.border }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full font-bold text-white shadow-sm"
                  style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
                >
                  {dbCourses && !editingCourse ? "บันทึกลง DB" : "บันทึกรายวิชา"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: กฎและเงื่อนไข (Rules & Conditions - FR4, FR7)
          ========================================================= */}
      {activeTab === "rules" && (
        <form onSubmit={handleSaveRules} className="space-y-6">
          {rulesSavedMsg && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-semibold animate-fade-in">
              <CheckCircle2 size={18} />
              <span>{rulesSavedMsg}</span>
            </div>
          )}

          <SectionCard hoverable={false} className="p-6">
            <h4 className="font-extrabold text-base text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={18} style={{ color: C.teal }} />
              <span>เพดานและข้อจำกัดด้านเวลา</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="ชั่วโมงสอนสูงสุดต่อวัน (ชม.)">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={rules.dailyMaxHours}
                  onChange={(e) => setRules({ ...rules, dailyMaxHours: Number(e.target.value) })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-bold figure"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <Field label="เพดานชั่วโมง/เดือน สำหรับ TA (ชม.)">
                <input
                  type="number"
                  min="1"
                  value={rules.monthlyMaxHoursTA}
                  onChange={(e) => setRules({ ...rules, monthlyMaxHoursTA: Number(e.target.value) })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-bold figure"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <Field label="เพดานชั่วโมง/เดือน สำหรับอาจารย์ (ชม.)">
                <input
                  type="number"
                  min="1"
                  value={rules.monthlyMaxHoursTeacher}
                  onChange={(e) => setRules({ ...rules, monthlyMaxHoursTeacher: Number(e.target.value) })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-bold figure"
                  style={{ borderColor: C.border }}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard hoverable={false} className="p-6">
            <h4 className="font-extrabold text-base text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>นโยบายการตรวจสอบความผิดปกติอัตโนมัติ</span>
            </h4>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50" style={{ borderColor: C.border }}>
                <input
                  type="checkbox"
                  checked={rules.checkDuplicateClaims}
                  onChange={(e) => setRules({ ...rules, checkDuplicateClaims: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">ตรวจสอบคำขอซ้ำซ้อน (Duplicate Claim Detection)</p>
                  <p className="text-xs text-slate-500">แจ้งเตือนและระงับหากผู้ยื่นยื่นคำขอในรายวิชาและวันสอนเดียวกันกับคำขอเดิม</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50" style={{ borderColor: C.border }}>
                <input
                  type="checkbox"
                  checked={rules.requireEvidence}
                  onChange={(e) => setRules({ ...rules, requireEvidence: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">บังคับแนบเอกสารหลักฐาน</p>
                  <p className="text-xs text-slate-500">แจ้งเตือนเจ้าหน้าที่เมื่อคำขอไม่มีการแนบไฟล์หลักฐานการสอนหรือใบลงเวลาที่ลงนาม</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50" style={{ borderColor: C.border }}>
                <input
                  type="checkbox"
                  checked={rules.checkQuotaBreach}
                  onChange={(e) => setRules({ ...rules, checkQuotaBreach: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">ตรวจสอบการเบิกเกินโควตารายวิชา (Course Quota Breach Check)</p>
                  <p className="text-xs text-slate-500">ตรวจเทียบจำนวนชั่วโมงสะสมในแต่ละรายวิชาไม่ให้เกินโควตาชั่วโมงที่ได้รับจัดสรร</p>
                </div>
              </label>
            </div>
          </SectionCard>

          <SectionCard hoverable={false} className="p-6">
            <h4 className="font-extrabold text-base text-slate-900 mb-4 flex items-center gap-2">
              <Wallet size={18} style={{ color: C.teal }} />
              <span>การบริหารงบประมาณ</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="งบประมาณจัดสรรประจำปี (บาท)">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={rules.annualBudget}
                  onChange={(e) => setRules({ ...rules, annualBudget: Number(e.target.value) })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-bold figure"
                  style={{ borderColor: C.border }}
                />
              </Field>

              <Field label="แจ้งเตือนเมื่อใช้งบประมาณเกิน (%)">
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={rules.budgetAlertThresholdPercent}
                  onChange={(e) => setRules({ ...rules, budgetAlertThresholdPercent: Number(e.target.value) })}
                  className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-bold figure"
                  style={{ borderColor: C.border }}
                />
              </Field>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 rounded-full font-bold text-white shadow-md text-sm transition-transform active:scale-95"
              style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
            >
              บันทึกการตั้งค่ากฎและเงื่อนไขทั้งหมด
            </button>
          </div>
        </form>
      )}

      {/* =========================================================
          TAB 5: ผู้ใช้งานและสิทธิ์ (Users & Access - FR5)
          ========================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                รายชื่อผู้ใช้งานและบทบาทในระบบ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดสิทธิ์ตามบทบาท ป้องกันการเข้าถึงข้อมูลส่วนบุคคล และควบคุมสิทธิ์ตามหน้าที่
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, อีเมล, บทบาท..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-full border text-xs outline-none bg-white w-56"
                  style={{ borderColor: C.border }}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowMatrix(!showMatrix)}
                className="px-4 py-2 rounded-full border text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
                style={{ borderColor: C.border }}
              >
                {showMatrix ? "ซ่อนตารางสิทธิ์" : "ดูตารางสิทธิ์ Matrix"}
              </button>
            </div>
          </div>

          {/* Access Control Matrix (If toggled) */}
          {showMatrix && (
            <SectionCard hoverable={false} className="p-0 overflow-hidden mb-6">
              <div className="p-4 border-b bg-slate-50 font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>ตารางตรวจสอบสิทธิ์ตามบทบาท (Access Control Matrix)</span>
                <span className="text-xs text-slate-500 font-normal">ควบคุมตามหลัก Least Privilege</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left px-4 py-3 font-semibold">สิทธิ์การใช้งาน</th>
                      {Object.values(ROLE).map((r) => (
                        <th key={r} className="text-center px-3 py-3 font-semibold">
                          {ROLE_META[r]?.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: C.border }}>
                    {PERMISSION_META.map((perm) => (
                      <tr key={perm.key} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {perm.label}
                          <span className="text-[10px] text-slate-400 block font-mono">{perm.key}</span>
                        </td>
                        {Object.values(ROLE).map((r) => {
                          const has = ROLE_PERMISSIONS[r]?.includes(perm.key);
                          const isOwn = has && OWN_ONLY_PERMISSIONS.has(perm.key) && [ROLE.TEACHER, ROLE.TA].includes(r);
                          return (
                            <td key={r} className="px-3 py-2.5 text-center">
                              {has ? (
                                <span className={`inline-flex items-center gap-1 font-bold ${isOwn ? "text-amber-600" : "text-emerald-600"}`}>
                                  <Check size={14} />
                                  {isOwn && <span className="text-[10px]">เฉพาะตน</span>}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Users Table */}
          <SectionCard hoverable={false} className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr style={{ background: "#F6F9FB", color: C.ink }}>
                    <th className="text-left px-5 py-3 font-semibold">ผู้ใช้งาน</th>
                    <th className="text-left px-4 py-3 font-semibold">อีเมล</th>
                    <th className="text-left px-4 py-3 font-semibold">สังกัด</th>
                    <th className="text-center px-4 py-3 font-semibold">บทบาทในระบบ</th>
                    <th className="text-right px-5 py-3 font-semibold">เปลี่ยนบทบาท</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: C.border }}>
                  {filteredUsers.map((u) => (
                    <tr key={u.userId || u.username} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <p className="font-extrabold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500 font-mono">@{u.username}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                        {u.email}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {u.fromDb
                          ? u.sectionCount > 0
                            ? `สอน ${u.sectionCount} section`
                            : "-"
                          : u.department || "สาขาวิชาวิทยาการคอมพิวเตอร์"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold inline-block"
                          style={{
                            background: u.role?.includes("TA")
                              ? C.tealSoft
                              : u.role?.includes("อาจารย์")
                              ? C.tealSoft
                              : u.role?.includes("ตรวจสอบ")
                              ? C.violetSoft
                              : u.role?.includes("อนุมัติ")
                              ? C.greenSoft
                              : "#FBEEE5",
                            color: u.role?.includes("TA")
                              ? C.tealDark
                              : u.role?.includes("อาจารย์")
                              ? C.tealDark
                              : u.role?.includes("ตรวจสอบ")
                              ? C.violet
                              : u.role?.includes("อนุมัติ")
                              ? C.green
                              : "#C4622D",
                          }}
                        >
                          {u.role || (u.fromDb ? "ไม่ได้สอน section ใด" : "ผู้ใช้งาน")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.fromDb ? (
                          <span className="text-[11px] text-slate-400">แก้ที่ Cognito group</span>
                        ) : (
                        <button
                          type="button"
                          onClick={() => setUserRoleModal(u)}
                          className="px-3 py-1.5 rounded-full border text-xs font-semibold hover:bg-slate-100 text-slate-700"
                          style={{ borderColor: C.border }}
                        >
                          แก้ไขบทบาท
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-500">
                        {displayUsers.length === 0
                          ? "กำลังโหลดรายชื่อผู้ใช้... (ถ้าไม่ขึ้น ตรวจ Lambda ClaimAdminMasterData / สิทธิ์ ADMIN)"
                          : "ไม่พบผู้ใช้ที่ค้นหา"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Modal: เปลี่ยนบทบาทผู้ใช้ */}
      {userRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">
              เปลี่ยนบทบาท: {userRoleModal.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              เลือกบทบาทใหม่สำหรับผู้ใช้งานนี้เพื่อควบคุมสิทธิ์ในระบบ
            </p>

            <div className="space-y-2">
              {[
                { label: "อาจารย์ผู้สอน", roleKey: ROLE.TEACHER },
                { label: "ผู้ช่วยสอน (TA)", roleKey: ROLE.TA },
                { label: "เจ้าหน้าที่ตรวจสอบ", roleKey: ROLE.REVIEWER },
                { label: "ผู้อนุมัติ", roleKey: ROLE.APPROVER },
                { label: "ผู้ดูแลระบบ", roleKey: ROLE.ADMIN },
              ].map(({ label, roleKey }) => (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => handleChangeUserRole(userRoleModal, label)}
                  className={`w-full text-left p-3 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between ${
                    userRoleModal.role === label ? "bg-teal-50 border-teal-500 text-teal-900" : "hover:bg-slate-50"
                  }`}
                  style={{ borderColor: userRoleModal.role === label ? C.teal : C.border }}
                >
                  <span>{label}</span>
                  {userRoleModal.role === label && <Check size={16} className="text-teal-600" />}
                </button>
              ))}
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setUserRoleModal(null)}
                className="px-4 py-2 rounded-full border text-xs font-bold text-slate-700 hover:bg-slate-50"
                style={{ borderColor: C.border }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 6: นำเข้า/แลกเปลี่ยนข้อมูล (Data Exchange - FR10)
          ========================================================= */}
      {activeTab === "dataExchange" && (
        <div className="space-y-6">
          {syncSuccessMsg && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-semibold">
              <CheckCircle2 size={18} />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source 1: TU Registrar System Sync */}
            <SectionCard hoverable={false} className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                <RefreshCw size={24} className={syncing ? "animate-spin" : ""} />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                เชื่อมต่อระบบทะเบียนมหาวิทยาลัย (TU Registrar)
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                ดึงข้อมูลตารางสอน รายวิชา และการมอบหมายอาจารย์/ผู้ช่วยสอน TA ล่าสุดจากระบบส่วนกลางของมหาวิทยาลัยโดยตรง
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncTU}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white shadow-md disabled:opacity-50"
                  style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
                >
                  <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                  <span>{syncing ? "กำลังเชื่อมต่อและนำเข้าข้อมูล..." : "ดึงข้อมูลจาก TU Registrar (Sync Now)"}</span>
                </button>
              </div>
            </SectionCard>

            {/* Source 2: CSV / Excel Upload */}
            <SectionCard hoverable={false} className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <Upload size={24} />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                นำเข้าข้อมูลจากไฟล์ CSV (Manual Import)
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                อัปโหลดไฟล์ CSV รายวิชาและภาระงานสอนเพื่อปรับปรุงข้อมูลในระบบ พร้อมระบบตรวจสอบความถูกต้องก่อนนำเข้า
              </p>

              <div className="mt-6 flex gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors">
                  <Upload size={16} />
                  <span>เลือกไฟล์ CSV</span>
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                </label>
              </div>
            </SectionCard>
          </div>

          {/* CSV Preview Modal / Area */}
          {csvPreview && (
            <SectionCard hoverable={false} className="p-6 border-2 border-teal-500 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b mb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    ตรวจสอบตัวอย่างข้อมูลก่อนนำเข้า: {csvPreview.fileName}
                  </h4>
                  <p className="text-xs text-emerald-600 font-semibold">
                    ✓ ตรวจสอบรูปแบบข้อมูลผ่านเกณฑ์ทั้งหมด ({csvPreview.rows.length} รายการ)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCsvPreview(null)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-slate-50"
                    style={{ borderColor: C.border }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleConfirmCsvImport}
                    className="px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ background: C.tealDark }}
                  >
                    ยืนยันนำเข้าข้อมูล
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="px-3 py-2 text-left">รหัสวิชา</th>
                      <th className="px-3 py-2 text-left">ชื่อวิชา</th>
                      <th className="px-3 py-2 text-center">Section</th>
                      <th className="px-3 py-2 text-center">โควตาชั่วโมง</th>
                      <th className="px-3 py-2 text-center">อัตรา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: C.border }}>
                    {csvPreview.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono font-bold text-teal-800">{r.code}</td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-center font-mono">{r.sec}</td>
                        <td className="px-3 py-2 text-center font-bold">{r.hours} ชม.</td>
                        <td className="px-3 py-2 text-center">฿{r.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Import Audit Trail (FR10) */}
          <SectionCard hoverable={false} className="p-6">
            <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center justify-between">
              <span>ประวัติการนำเข้าและแลกเปลี่ยนข้อมูลย้อนหลัง</span>
              <span className="text-xs text-slate-500 font-normal">บันทึกเพื่อความโปร่งใสและตรวจสอบย้อนหลัง</span>
            </h4>

            <div className="divide-y" style={{ borderColor: C.border }}>
              {importLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{log.source}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{new Date(log.timestamp).toLocaleString("th-TH")}</p>
                    <p className="text-[11px] text-slate-500 font-medium">โดย: {log.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText || "ยืนยัน"}
        tone="danger"
        onConfirm={() => {
          confirmState?.onConfirm?.();
          setConfirmState(null);
        }}
        onClose={() => setConfirmState(null)}
      />
    </div>
  );
}

