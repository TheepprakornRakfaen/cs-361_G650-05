import React, { useState, useMemo } from "react";
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

const baht = (n) => `฿${Number(n || 0).toLocaleString("th-TH")}`;

export default function AdminManagement({ user, claims = [], onReload }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | compTypes | masterData | rules | users | dataExchange
  const [masterSubTab, setMasterSubTab] = useState("courses"); // courses | terms

  // กล่องยืนยันทั่วไป (แทน window.confirm) — { title, message, confirmText, onConfirm }
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = (options) => setConfirmState(options);

  // Rules state
  const [rules, setRules] = useState(getSystemRules);
  const [rulesSavedMsg, setRulesSavedMsg] = useState("");

  // Compensation types state
  const [compTypes, setCompTypes] = useState(getCompensationTypes);
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
    course_code: "",
    course_name_th: "",
    course_name_en: "",
    section_no: "650001",
    max_hour: 45,
    rate: 600,
  });

  // Terms & Periods state
  const [terms, setTerms] = useState(getMasterTerms);
  const [periods, setPeriods] = useState(getMasterPeriods);

  // Users state
  const [usersList, setUsersList] = useState(MOCK_USERS);
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

  const handleSaveCourse = (e) => {
    e.preventDefault();
    const payload = {
      ...(editingCourse || {}),
      ...courseFormData,
      section_id: editingCourse?.section_id || Date.now(),
      status: "ACTIVE",
    };
    const updated = saveMasterCourse(payload);
    setCourses(updated);
    setCourseModalOpen(false);
  };

  const handleDeleteCourse = (sectionId) => {
    askConfirm({
      title: "ลบรายวิชา",
      message: "ยืนยันที่จะลบรายวิชานี้ใช่หรือไม่?",
      confirmText: "ยืนยันลบ",
      onConfirm: () => {
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

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

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
                รองรับการกำหนดประเภทค่าตอบแทน อัตราต่อชั่วโมง เอกสารหลักฐานที่ต้องแนบ และรองรับประเภทใหม่ในอนาคต
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCompModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
              style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
            >
              <Plus size={16} />
              <span>เพิ่มประเภทค่าตอบแทนใหม่</span>
            </button>
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

                    <div className="flex items-center gap-1">
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
                รายวิชาและการจัดสรร ({courses.length})
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
            </div>

            {masterSubTab === "courses" && (
              <button
                type="button"
                onClick={() => handleOpenCourseModal()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white shadow-sm"
                style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
              >
                <Plus size={16} />
                <span>เพิ่มรายวิชาใหม่</span>
              </button>
            )}
          </div>

          {/* Subtab Courses */}
          {masterSubTab === "courses" && (
            <SectionCard hoverable={false} className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr style={{ background: "#F6F9FB", color: C.ink }}>
                      <th className="text-left px-5 py-3 font-semibold">รหัสวิชา</th>
                      <th className="text-left px-4 py-3 font-semibold">ชื่อรายวิชา</th>
                      <th className="text-left px-4 py-3 font-semibold">กลุ่ม (Sec)</th>
                      <th className="text-center px-4 py-3 font-semibold">โควตาชั่วโมง</th>
                      <th className="text-center px-4 py-3 font-semibold">ชั่วโมงที่ใช้ไป</th>
                      <th className="text-center px-4 py-3 font-semibold">อัตราต่อชม.</th>
                      <th className="text-right px-5 py-3 font-semibold">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: C.border }}>
                    {courses.map((course) => (
                      <tr key={course.section_id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-extrabold text-teal-800">
                          {course.course_code}
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
                        <td className="px-4 py-3.5 text-center font-bold text-slate-800 figure">
                          {course.max_hour || 45} ชม.
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-600 figure">
                          {course.hour || 0} ชม.
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-900 figure">
                          ฿{course.rate || 600}
                        </td>
                        <td className="px-5 py-3.5 text-right">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Subtab Terms & Periods */}
          {masterSubTab === "terms" && (
            <div className="space-y-6">
              <SectionCard hoverable={false} className="p-6">
                <h4 className="font-bold text-base text-slate-900 mb-3">ภาคการศึกษา (Academic Terms)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {terms.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border ${
                        t.status === "ACTIVE" ? "bg-teal-50/50 border-teal-300" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-base text-slate-900">{t.semester}/{t.year}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === "ACTIVE" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {t.status === "ACTIVE" ? "ภาคปัจจุบัน" : "ปิดรอบแล้ว"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {t.start_date} ถึง {t.end_date}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard hoverable={false} className="p-6">
                <h4 className="font-bold text-base text-slate-900 mb-3">รอบการยื่นเบิกประจำภาค (Submission Periods)</h4>
                <div className="divide-y" style={{ borderColor: C.border }}>
                  {periods.map((p) => (
                    <div key={p.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.label || `รอบเดือน ${p.month}`}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              p.status === 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {p.status === 1 ? "กำลังเปิดรับคำขอ" : "ปิดรับแล้ว"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          เปิด: {new Date(p.open_at).toLocaleDateString("th-TH")} — ปิด: {new Date(p.close_at).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                    </div>
                  ))}
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
                {editingCourse ? "แก้ไขข้อมูลรายวิชา" : "เพิ่มรายวิชาใหม่"}
              </h3>
              <button
                onClick={() => setCourseModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-sm">
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="กลุ่มเรียน (Section)">
                  <input
                    type="text"
                    value={courseFormData.section_no}
                    onChange={(e) => setCourseFormData({ ...courseFormData, section_no: e.target.value })}
                    className="w-full rounded-xl border px-3.5 py-2.5 outline-none font-mono"
                    style={{ borderColor: C.border }}
                  />
                </Field>

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
                  บันทึกรายวิชา
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
                    <tr key={u.username} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <p className="font-extrabold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500 font-mono">@{u.username}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                        {u.email}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {u.department || "สาขาวิชาวิทยาการคอมพิวเตอร์"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold inline-block"
                          style={{
                            background: u.role?.includes("TA")
                              ? "#E8F0FA"
                              : u.role?.includes("อาจารย์")
                              ? "#E8F0FA"
                              : u.role?.includes("ตรวจสอบ")
                              ? "#F1EFFB"
                              : u.role?.includes("อนุมัติ")
                              ? "#DFF5E6"
                              : "#FBEEE5",
                            color: u.role?.includes("TA")
                              ? "#1E5687"
                              : u.role?.includes("อาจารย์")
                              ? "#1E5687"
                              : u.role?.includes("ตรวจสอบ")
                              ? "#6E62C9"
                              : u.role?.includes("อนุมัติ")
                              ? "#1E8E4F"
                              : "#C4622D",
                          }}
                        >
                          {u.role || "ผู้ใช้งาน"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setUserRoleModal(u)}
                          className="px-3 py-1.5 rounded-full border text-xs font-semibold hover:bg-slate-100 text-slate-700"
                          style={{ borderColor: C.border }}
                        >
                          แก้ไขบทบาท
                        </button>
                      </td>
                    </tr>
                  ))}
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

