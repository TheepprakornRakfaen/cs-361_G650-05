import React, { useEffect, useState } from "react";

import { C } from "./theme";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LoginModal from "./components/LoginModal";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Assignments from "./pages/Assignments";
import MyClaims from "./pages/MyClaims";
import CreateClaim from "./pages/CreateClaim";
import ClaimDetail from "./pages/ClaimDetail";
import CreateClaimList from "./pages/CreateClaimList";

import {
  loadState,
  saveState,
  addClaim,
} from "./data/store";

const SUBTITLE_MAP = {
  home: "หน้าแรก",
  dashboard: "แดชบอร์ด",
  assignments: "งานสอน",
  myclaims: "คำขอของฉัน",
  create: "สร้างคำขอ",
  "claim-create": "กรอกข้อมูลคำขอ",
  rounds: "รอบการยื่น",
  detail: "รายละเอียดคำขอ",
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

  const [loginOpen, setLoginOpen] =
    useState(false);

  const [selectedClaimId, setSelectedClaimId] =
    useState(null);

  const [presetCourse, setPresetCourse] =
    useState("");

  const [presetRound, setPresetRound] =
    useState(null);

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
    setView("claim-create");
  };

  /*
   * สร้างคำขอจากรายวิชา
   */
  const goCreateFor = (courseCode) => {
    setPresetCourse(courseCode);
    setPresetRound(null);
    setView("claim-create");
  };

  /*
   * สร้างคำขอจากรอบ
   */
  const goCreateForRound = (round) => {
    setPresetCourse("");
    setPresetRound(round);
    setView("claim-create");
  };

  /*
   * เปิดรายละเอียดคำขอ
   */
  const goDetail = (id) => {
    setSelectedClaimId(id);
    setView("detail");
  };

  /*
   * Submit คำขอ
   */
  const handleSubmit = (form) => {
    const newClaim = addClaim(form);

    /*
     * โหลดข้อมูลใหม่จาก localStorage
     */
    const latestState = loadState();

    setState(latestState);

    setSelectedClaimId(newClaim.id);

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

      case "claim-create":
        return (
          <CreateClaim
            presetCourse={presetCourse}
            presetRound={presetRound}
            courses={courses}
            rounds={rounds}
            onCancel={() =>
              setView("myclaims")
            }
            onSubmit={handleSubmit}
          />
        );

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
          />
        );

      default:
        return (
          <Home query={search} />
        );
    }
  };

  return (
    <div
      className="w-full min-h-screen flex"
      style={{
        background: C.bg,
      }}
    >
      <Sidebar
        view={view}
        setView={setView}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() =>
          setMobileOpen(false)
        }
      />

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
        <Topbar
          onMenuClick={handleMenuClick}
          subtitle={
            SUBTITLE_MAP[view] ||
            "ระบบเบิกค่าสอน"
          }
          searchQuery={search}
          onSearchChange={setSearch}
          onProfileClick={() =>
            setLoginOpen(true)
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-5 md:p-9">
            {renderPage()}
          </div>

          {view === "home" && (
            <Footer />
          )}
        </main>
      </div>

      <LoginModal
        open={loginOpen}
        onClose={() =>
          setLoginOpen(false)
        }
      />
    </div>
  );
}