import React, { useEffect, useState } from "react";

import { C } from "./theme";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assignments from "./pages/Assignments";
import MyClaims from "./pages/MyClaims";
import CreateClaim from "./pages/CreateClaim";
import ClaimDetail from "./pages/ClaimDetail";
import CreateClaimList from "./pages/CreateClaimList";
import Profile from "./pages/Profile";

import {
  loadState,
  saveState,
  addClaim,
  updateClaimFromForm,
} from "./data/store";

import {
  loadSessionUser,
  saveSessionUser,
} from "./data/users";

const SUBTITLE_MAP = {
  home: "หน้าแรก",
  dashboard: "แดชบอร์ด",
  assignments: "งานสอน",
  myclaims: "คำขอของฉัน",
  create: "สร้างคำขอ",
  "claim-create": "กรอกข้อมูลคำขอ",
  rounds: "รอบการยื่น",
  detail: "รายละเอียดคำขอ",
  profile: "ข้อมูลส่วนตัว",
};

const SYSTEM_ROUNDS = [
  {
    id: "current-1-2569",
    label: "รอบการยื่นภาคการศึกษา 1/2569",
    period: "1 มิถุนายน - 31 กรกฎาคม 2569",
    deadline: "31 กรกฎาคม 2569",
    status: "Open",
  },
];

export default function App() {
  const [view, setView] = useState("home");

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [selectedClaimId, setSelectedClaimId] =
    useState(null);

  const [presetCourse, setPresetCourse] =
    useState("");

  const [presetRound, setPresetRound] =
    useState(null);

  const [editingClaimId, setEditingClaimId] =
    useState(null);

  /*
   * ผู้ใช้ที่เข้าสู่ระบบอยู่ (null = ยังไม่เข้าสู่ระบบ)
   * เก็บไว้ใน localStorage เพื่อให้รีเฟรชแล้วไม่หลุด
   */
  const [currentUser, setCurrentUser] =
    useState(() => loadSessionUser());

  const isLoggedIn = Boolean(currentUser);

  useEffect(() => {
    saveSessionUser(currentUser);
  }, [currentUser]);

  const [state, setState] = useState(() =>
    loadState()
  );

  /*
   * บันทึก localStorage ทุกครั้งที่ state เปลี่ยน
   */
  useEffect(() => {
    saveState(state);
  }, [state]);

  /*
   * ป้องกันข้อมูลเสีย
   */
  const claims = Array.isArray(state?.claims)
    ? state.claims
    : [];

  const courses = Array.isArray(state?.courses)
    ? state.courses
    : [];

  const storedRounds = Array.isArray(state?.rounds)
    ? state.rounds
    : [];

  const rounds = [
    ...SYSTEM_ROUNDS,
    ...storedRounds,
  ];

  /*
   * เปิด/ปิด Sidebar
   */
  const handleMenuClick = () => {
    const isMobile =
      window.matchMedia(
        "(max-width: 767px)"
      ).matches;

    if (isMobile) {
      setMobileOpen((value) => !value);
    } else {
      setCollapsed((value) => !value);
    }
  };

  /*
   * สร้างคำขอใหม่
   */
  const goCreate = () => {
    setPresetCourse("");
    setPresetRound(null);
    setEditingClaimId(null);
    setView("claim-create");
  };

  /*
   * สร้างคำขอจากรายวิชา
   */
  const goCreateFor = (courseCode) => {
    setPresetCourse(courseCode);
    setPresetRound(null);
    setEditingClaimId(null);
    setView("claim-create");
  };

  /*
   * สร้างคำขอจากรอบ
   */
  const goCreateForRound = (round) => {
    setPresetCourse("");
    setPresetRound(round);
    setEditingClaimId(null);
    setView("claim-create");
  };

  /*
   * แก้ไขคำขอเดิม (แบบร่าง / ถูกส่งกลับ)
   */
  const goEditClaim = (id) => {
    setPresetCourse("");
    setPresetRound(null);
    setEditingClaimId(id);
    setView("claim-create");
  };

  /*
   * ออกจากระบบ
   */
  const handleLogout = () => {
    setCurrentUser(null);
    setView("home");
  };

  /*
   * เปิดรายละเอียดคำขอ
   */
  const goDetail = (id) => {
    setSelectedClaimId(id);
    setView("detail");
  };

  /*
   * Submit คำขอ (สร้างใหม่ หรือยื่นคำขอที่แก้ไข)
   */
  const handleSubmit = (form) => {
    const savedClaim = editingClaimId
      ? updateClaimFromForm(
          editingClaimId,
          form,
          "Pending"
        )
      : addClaim(form, "Pending");

    /*
     * โหลดข้อมูลใหม่จาก localStorage
     */
    const latestState = loadState();

    setState(latestState);

    setEditingClaimId(null);

    setSelectedClaimId(savedClaim.id);

    setView("detail");
  };

  /*
   * บันทึกร่างคำขอ (สร้างร่างใหม่ หรืออัปเดตร่างเดิม)
   */
  const handleSaveDraft = (form) => {
    const savedClaim = editingClaimId
      ? updateClaimFromForm(
          editingClaimId,
          form,
          "Draft"
        )
      : addClaim(form, "Draft");

    const latestState = loadState();

    setState(latestState);

    setEditingClaimId(null);

    setSelectedClaimId(savedClaim.id);

    setView("detail");
  };

  /*
   * หาคำขอที่เลือก
   */
  const selectedClaim =
    claims.find(
      (claim) =>
        String(claim.id) ===
        String(selectedClaimId)
    ) || null;

  /*
   * เปลี่ยนหน้า
   */
  const renderPage = () => {
    switch (view) {
      case "home":
        return (
          <Home query={search} />
        );

      case "dashboard":
        return (
          <Dashboard
            claims={claims}
            goCreate={goCreate}
            goDetail={goDetail}
          />
        );

      case "assignments":
        return (
          <Assignments
            courses={courses}
            goCreateFor={goCreateFor}
          />
        );

      case "myclaims":
        return (
          <MyClaims
            claims={claims}
            goDetail={goDetail}
            goCreate={goCreate}
          />
        );

      case "create":
      case "rounds":
        return (
          <CreateClaimList
            rounds={rounds}
            courses={courses}
            goCreateForRound={
              goCreateForRound
            }
          />
        );

      case "claim-create": {
        const editingClaim = editingClaimId
          ? claims.find(
              (claim) =>
                String(claim.id) ===
                String(editingClaimId)
            )
          : null;

        return (
          <CreateClaim
            presetCourse={presetCourse}
            presetRound={presetRound}
            initialClaim={editingClaim}
            courses={courses}
            rounds={rounds}
            onCancel={() =>
              setView("myclaims")
            }
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
          />
        );
      }

      case "detail":
        return (
          <ClaimDetail
            claim={selectedClaim}
            course={courses.find(
              (course) =>
                course.code ===
                selectedClaim?.courseCode
            )}
            goBack={() =>
              setView("myclaims")
            }
            onEdit={goEditClaim}
          />
        );

      case "profile":
        return (
          <Profile
            user={currentUser}
            courses={courses}
            claims={claims}
            onLogin={() => setView("login")}
          />
        );

      default:
        return (
          <Home query={search} />
        );
    }
  };

  /*
   * หน้า Login แยกต่างหาก (ไม่ใช่ popup)
   */
  if (view === "login") {
    return (
      <Login
        onBack={() => setView("home")}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setView("home");
        }}
      />
    );
  }

        return (
    <div
      className="w-full h-screen overflow-hidden flex flex-col"
      style={{
        background: C.bg,
      }}
    >
      {/* =========================
          Header ด้านบน
          ========================= */}
      <Topbar
        onMenuClick={handleMenuClick}
        subtitle={
          SUBTITLE_MAP[view] ||
          "ระบบเบิกค่าสอน"
        }
        searchQuery={search}
        onSearchChange={setSearch}
        onProfileClick={() =>
          setView("login")
        }
        isLoggedIn={isLoggedIn}
        user={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setView("profile")}
      />

      {/* =========================
          ส่วนด้านล่าง Header
          Sidebar + Content
          ========================= */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <Sidebar
          view={view}
          setView={setView}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() =>
            setMobileOpen(false)
          }
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <div
          className={`
            flex-1
            flex
            flex-col
            min-w-0
            transition-all
            duration-200

            ${
              collapsed
                ? "md:ml-[84px]"
                : "md:ml-[280px]"
            }
          `}
        >
          <main className="flex-1 overflow-y-auto">
            <div className="p-5 md:p-9">
              {renderPage()}
            </div>

            {view === "home" && (
              <Footer />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}