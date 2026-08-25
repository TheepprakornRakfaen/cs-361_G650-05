import React, { useState } from "react";
import { C } from "./theme";
import { INITIAL_CLAIMS, courseByCode } from "./data/mockData";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Toast from "./components/Toast";

import Dashboard from "./pages/Dashboard";
import Assignments from "./pages/Assignments";
import MyClaims from "./pages/MyClaims";
import ClaimDetail from "./pages/ClaimDetail";
import CreateClaim from "./pages/CreateClaim";

const SUBTITLE_MAP = {
  dashboard: "แดชบอร์ด",
  assignments: "งานสอนของฉัน",
  myclaims: "คำขอของฉัน",
  detail: "รายละเอียดคำขอ",
  create: "สร้างคำขอเบิกค่าสอน",
};

export default function App() {
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [presetCourse, setPresetCourse] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  const selectedClaim = claims.find((c) => c.id === selectedId);

  function goDetail(id) {
    setSelectedId(id);
    setView("detail");
  }
  function goCreate(courseCode) {
    setPresetCourse(courseCode || null);
    setView("create");
  }
  function setViewAndReset(v) {
    setView(v);
    if (v === "create") setPresetCourse(null);
  }

  function submitClaim(form) {
    const course = courseByCode(form.courseCode);
    const newId = `CLM-2026-${String(claims.length + 1).padStart(3, "0")}`;
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    const d = form.teachingDate ? new Date(form.teachingDate) : new Date();
    const monthLabel = `${monthNames[d.getMonth()]} 2026`;

    const claim = {
      id: newId,
      courseCode: form.courseCode,
      month: monthLabel,
      hours: Number(form.hours) || 0,
      rate: course.rate,
      amount: Number(form.amount) || 0,
      status: "Pending",
      teachingDate: form.teachingDate || "—",
      notes: form.notes,
      evidence: form.fileName,
    };

    setClaims((prev) => [claim, ...prev]);
    setToast(`ยื่นคำขอ ${newId} สำเร็จ กำลังรอตรวจสอบ`);
    goDetail(newId);
  }

  return (
    <div className="w-full min-h-screen flex" style={{ background: C.bg }}>
      <Sidebar view={view} setView={setViewAndReset} collapsed={collapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setCollapsed((c) => !c)} subtitle={SUBTITLE_MAP[view]} />

        <main className="flex-1 overflow-y-auto p-5 md:p-9">
          {view === "dashboard" && <Dashboard claims={claims} goCreate={() => goCreate()} goDetail={goDetail} />}
          {view === "assignments" && <Assignments goCreateFor={(code) => goCreate(code)} />}
          {view === "myclaims" && <MyClaims claims={claims} goDetail={goDetail} goCreate={() => goCreate()} />}
          {view === "detail" && <ClaimDetail claim={selectedClaim} goBack={() => setView("myclaims")} />}
          {view === "create" && (
            <CreateClaim presetCourse={presetCourse} onCancel={() => setView("myclaims")} onSubmit={submitClaim} />
          )}
        </main>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
