import React, { useEffect, useState } from "react";

import { C } from "./theme";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { scrollToSection } from "./utils/scroll";
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
import Contact from "./pages/Contact";
import Notifications from "./pages/Notifications";

import {
  loadState,
  saveState,
  addClaim,
  updateClaimFromForm,
} from "./data/store";

import {
  getAuthenticatedUser,
  getIdToken,
  logoutFromCognito,
} from "./services/auth";

import { buildUserCourses } from "./data/rates";
import {
  buildNotifications,
  loadReadIds,
  saveReadIds,
} from "./data/notifications";
// import { getTerms, getPeriods } from "./api/termApi";
// import { getCourses } from "./api/courseApi";
import {
  syncCurrentUser,
  getTerms,
  getPeriods,
  getCourses,
  getClaims,
} from "./services/api";

import { createClaim } from "./services/api";
import { uploadClaimEvidence } from "./services/evidence";

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
  contact: "ติดต่อเรา",
  notifications: "การแจ้งเตือน",
};

/*
 * หน้าที่ต้องเข้าสู่ระบบก่อน (หน้าแรกกับหน้า Login เข้าได้เลย)
 */
const PROTECTED_VIEWS = new Set([
  "dashboard",
  "assignments",
  "myclaims",
  "create",
  "rounds",
  "claim-create",
  "detail",
  "profile",
  "notifications",
]);

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

  /*
   * ตัวกรองสถานะตอนเปิดหน้า "คำขอของฉัน" จากที่อื่น
   * เช่น กดการ์ด "แบบร่าง" ในหน้าโปรไฟล์ → แสดงเฉพาะแบบร่าง
   */
  const [myClaimsFilter, setMyClaimsFilter] = useState("All");

  const openMyClaims = (status = "All") => {
    setMyClaimsFilter(status);
    setView("myclaims");
  };

  // ออกจากหน้าคำขอของฉันแล้ว รอบหน้าเปิดจากเมนูให้กลับมาแสดงทั้งหมด
  useEffect(() => {
    if (view !== "myclaims") {
      setMyClaimsFilter("All");
    }
  }, [view]);

  const [collapsed, setCollapsed] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [selectedClaimId, setSelectedClaimId] = useState(null);

  const [presetCourse, setPresetCourse] = useState("");

  const [presetRound, setPresetRound] = useState(null);

  // หน้าที่จะพาไปหลังล็อกอินสำเร็จ (เช่น กดปุ่ม "เข้าสู่ระบบเพื่อยื่นคำขอ" จากหน้าแรก)
  const [afterLoginView, setAfterLoginView] = useState(null);

  // ออกจากขั้นตอนสร้างคำขอแล้วให้ล้างค่าที่จำไว้ ไม่ให้ค้างไปรอบถัดไป
  useEffect(() => {
    if (!["create", "rounds", "claim-create"].includes(view)) {
      setPresetCourse("");
      setPresetRound(null);
    }
  }, [view]);

  const [editingClaimId, setEditingClaimId] = useState(null);

  // =========================
  // Semester & Submission Period
  // =========================
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [apiCourses, setApiCourses] = useState([]);

  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState("");
  const [periodLoading, setPeriodLoading] = useState(false);

  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState("");

  const loadTerms = async (token) => {
    setTermLoading(true);
    setTermError("");

    try {
      const data = await getTerms(token);

      const nextTerms = Array.isArray(data?.terms) ? data.terms : [];

      setTerms(nextTerms);

      return nextTerms;
    } catch (error) {
      console.error("Load terms error:", error);
      setTerms([]);
      setTermError(error?.message || "ไม่สามารถโหลดภาคการศึกษาได้");

      return [];
    } finally {
      setTermLoading(false);
    }
  };

  const loadPeriods = async (termId, token) => {
    if (!termId) {
      setPeriods([]);
      setSelectedPeriodId(null);
      return [];
    }

    setPeriodLoading(true);
    setTermError("");

    try {
      const data = await getPeriods(termId, token);

      const nextPeriods = Array.isArray(data?.periods) ? data.periods : [];

      setPeriods(nextPeriods);

      return nextPeriods;
    } catch (error) {
      console.error("Load periods error:", error);
      setPeriods([]);
      setSelectedPeriodId(null);
      setTermError(error?.message || "ไม่สามารถโหลดรอบการยื่นได้");

      return [];
    } finally {
      setPeriodLoading(false);
    }
  };

  const loadCourses = async (termId, token) => {
    if (!termId) {
      setApiCourses([]);
      setCourseError("");
      return [];
    }

    setCourseLoading(true);
    setCourseError("");

    try {
      const data = await getCourses(termId, token);
      const nextCourses = Array.isArray(data?.courses) ? data.courses : [];

      setApiCourses(nextCourses);

      return nextCourses;
    } catch (error) {
      console.error("Load courses error:", error);
      setApiCourses([]);
      setCourseError(error?.message || "ไม่สามารถโหลดรายวิชาได้");
      return [];
    } finally {
      setCourseLoading(false);
    }
  };

  const handleTermChange = async (termId) => {
    setSelectedTermId(termId);
    setPeriods([]);
    setSelectedPeriodId(null);
    setApiCourses([]);

    if (!termId) return;

    try {
      const token = await getIdToken();

      if (!token) {
        throw new Error("ไม่พบ token สำหรับเข้าสู่ระบบ");
      }

      await Promise.all([
        loadPeriods(termId, token),
        loadCourses(termId, token),
      ]);
    } catch (error) {
      console.error("Load term-dependent data error:", error);
    }
  };

  /*
   * ผู้ใช้ที่เข้าสู่ระบบอยู่ (null = ยังไม่เข้าสู่ระบบ)
   * เก็บไว้ใน localStorage เพื่อให้รีเฟรชแล้วไม่หลุด
   */
  const [currentUser, setCurrentUser] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const isLoggedIn = Boolean(currentUser);

  /*
   * ตรวจ Cognito session
   * ทุกครั้งที่เปิดเว็บ / refresh
   */
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const user = await getAuthenticatedUser();

        if (active) {
          setCurrentUser(user);
        }
      } catch {
        if (active) {
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    async function connectBackend() {
      /*
      * 1. Sync Cognito user กับ backend
      *
      * ถ้าตรงนี้ fail:
      * ผู้ใช้ยังถือว่า Login สำเร็จอยู่
      */
      try {
        const profile =
          await syncCurrentUser();

        console.log(
          "POST /api/auth/me:",
          profile
        );
      } catch (error) {
        console.error(
          "POST /api/auth/me failed:",
          error
        );
      }

      /*
      * 2. ทดสอบ Backend APIs
      */
      try {
        const [
          terms,
          periods,
          courses,
          claims,
        ] = await Promise.all([
          getTerms(),
          getPeriods(),
          getCourses(),
          getClaims(),
        ]);

        console.log(
          "GET /api/term:",
          terms
        );

        console.log(
          "GET /api/period:",
          periods
        );

        console.log(
          "GET /api/courses:",
          courses
        );

        console.log(
          "GET /api/claims:",
          claims
        );
      } catch (error) {
        console.error(
          "Backend API test failed:",
          error
        );
      }
    }

    connectBackend();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let active = true;

    async function loadInitialData() {
      try {
        const token = await getIdToken();

        if (!token) {
          throw new Error("ไม่พบ token สำหรับเข้าสู่ระบบ");
        }

        if (active) {
          await loadTerms(token);
        }
      } catch (error) {
        console.error("Load initial data error:", error);
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const [state, setState] = useState(() => loadState());

  /*
   * บันทึก localStorage ทุกครั้งที่ state เปลี่ยน
   */
  useEffect(() => {
    saveState(state);
  }, [state]);

  /*
   * ป้องกันข้อมูลเสีย
   */
  const allClaims = Array.isArray(state?.claims) ? state.claims : [];

  /*
   * แต่ละคนเห็นเฉพาะคำขอของตัวเอง (owner = username ของคนที่สร้าง)
   * หมายเหตุ: คำขอเก่าที่สร้างก่อนมี owner จะไม่แสดงให้ใครเห็น
   */
  const claims = allClaims.filter(
    (claim) => currentUser && claim.owner === currentUser.username,
  );

  const allCourses = Array.isArray(state?.courses) ? state.courses : [];

  /*
   * รายวิชาที่ผู้ใช้ได้รับมอบหมาย + อัตราตามตำแหน่ง + ชั่วโมงที่ใช้ไป
   * (ไม่มีวิชาที่ได้รับมอบหมาย = [] → ยื่นเบิกไม่ได้)
   */
  const courses = buildUserCourses(currentUser, allCourses, claims);

  /*
   * การแจ้งเตือน (สร้างจากสถานะคำขอของผู้ใช้ + ข่าวสาร)
   * สถานะอ่านแล้วเก็บใน localStorage แยกตามผู้ใช้
   */
  const [readIds, setReadIds] = useState([]);

  useEffect(() => {
    setReadIds(currentUser ? loadReadIds(currentUser.username) : []);
  }, [currentUser]);

  const notifications = buildNotifications(claims);
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markRead = (ids) => {
    const list = Array.isArray(ids) ? ids : [ids];
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...list]));
      if (currentUser) saveReadIds(currentUser.username, next);
      return next;
    });
  };

  const storedRounds = Array.isArray(state?.rounds) ? state.rounds : [];

  const rounds = [...SYSTEM_ROUNDS, ...storedRounds];

  /*
   * เปิด/ปิด Sidebar
   */
  // เลือกผลการค้นหา: กลับไปหน้าแรก แล้วเลื่อนสมูทไปหัวข้อนั้น
  const handleSearchSelect = (sectionId) => {
    setSearch("");
    setMobileOpen(false);
    const go = () => scrollToSection(sectionId);
    if (view === "home") {
      go();
    } else {
      setView("home");
      // รอให้หน้าแรก render เสร็จก่อนค่อยเลื่อน
      setTimeout(go, 120);
    }
  };

  const handleMenuClick = () => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    if (isMobile) {
      setMobileOpen((value) => !value);
    } else {
      setCollapsed((value) => !value);
    }
  };

  /*
   * สร้างคำขอใหม่
   */
  const goLoginThenCreate = () => {
    setAfterLoginView("create");
    setView("login");
  };

  const goCreate = () => {
    setPresetCourse("");
    setPresetRound(null);
    setEditingClaimId(null);
    setView("create"); // ไปหน้าเลือกรอบก่อน (สร้างได้เฉพาะรอบที่เปิดรับ)
  };

  /*
   * สร้างคำขอจากรายวิชา
   */
  const goCreateFor = (courseCode) => {
    setPresetCourse(courseCode); // จำวิชาไว้ แล้วให้เลือกรอบที่เปิดรับก่อน
    setPresetRound(null);
    setEditingClaimId(null);
    setView("create");
  };

  /*
   * สร้างคำขอจากรอบ
   */
  const goCreateForRound = (round) => {
    // ไม่ล้าง presetCourse เพื่อคงวิชาที่เลือกมาจากหน้ารายวิชา
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
  const handleLogout = async () => {
    try {
      await logoutFromCognito();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setCurrentUser(null);
      setView("home");
    }
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
  const handleSubmit = async (form, evidenceFile) => {
    try {
      /*
      * STEP 1
      * สร้าง Claim จริงก่อน
      */
      const claimResponse =
        await createClaim(
          /* payload ของ Claim API */
        );

      console.log(
        "Claim created:",
        claimResponse
      );

      /*
      * STEP 2
      * เอา claimId จริงจาก Backend
      */
      const claimId =
        getClaimIdFromResponse(
          claimResponse
        );

      if (!claimId) {
        throw new Error(
          "Backend created the claim but did not return claimId"
        );
      }

      /*
      * STEP 3
      * ถ้ามีไฟล์ → Upload ไป S3
      */
      if (evidenceFile) {
        const evidence =
          await uploadClaimEvidence(
            claimId,
            evidenceFile
          );

        console.log(
          "Evidence uploaded:",
          evidence
        );
      }

      /*
      * STEP 4
      * ไปหน้ารายละเอียด
      */
      setEditingClaimId(null);
      setSelectedClaimId(claimId);
      setView("detail");
    } catch (error) {
      console.error(
        "Submit claim failed:",
        error
      );

      alert(
        error.message ||
          "ไม่สามารถยื่นคำขอได้"
      );
    }
  };

  function getClaimIdFromResponse(data) {
    return (
      data?.claimId ||
      data?.claim_id ||
      data?.id ||
      data?.claim?.claimId ||
      data?.claim?.claim_id ||
      data?.claim?.id ||
      null
    );
  }

  /*
   * บันทึกร่างคำขอ (สร้างร่างใหม่ หรืออัปเดตร่างเดิม)
   */
  const handleSaveDraft = (form) => {
    const savedClaim = editingClaimId
      ? updateClaimFromForm(editingClaimId, form, "Draft")
      : addClaim(form, "Draft", currentUser?.username);

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
    claims.find((claim) => String(claim.id) === String(selectedClaimId)) ||
    null;

  /*
   * เปลี่ยนหน้า
   */
  const renderPage = () => {
    switch (view) {
      case "home":
        return <Home query={search} isLoggedIn={isLoggedIn} goCreate={goCreate} onLogin={goLoginThenCreate} rounds={rounds} />;

      case "dashboard":
        return (
          <Dashboard
            user={currentUser}
            claims={claims}
            goCreate={goCreate}
            goDetail={goDetail}
            goMyClaims={() => setView("myclaims")}
          />
        );

      case "assignments":
        return (
          <Assignments
            courses={apiCourses}
            goCreateFor={goCreateFor}
            courseLoading={courseLoading}
            courseError={courseError}
          />
        );

      case "myclaims":
        return (
          <MyClaims
            claims={claims}
            goDetail={goDetail}
            goCreate={goCreate}
            initialStatus={myClaimsFilter}
          />
        );

      case "create":
      case "rounds":
        return (
          <CreateClaimList
            rounds={rounds}
            courses={courses}
            goCreateForRound={goCreateForRound}
          />
        );

      case "claim-create": {
        const editingClaim = editingClaimId
          ? claims.find((claim) => String(claim.id) === String(editingClaimId))
          : null;

        return (
          <CreateClaim
            presetCourse={presetCourse}
            presetRound={presetRound}
            initialClaim={editingClaim}
            courses={apiCourses}
            rounds={rounds}
            terms={terms}
            periods={periods}
            selectedTermId={selectedTermId}
            onTermChange={handleTermChange}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={setSelectedPeriodId}
            termLoading={termLoading}
            periodLoading={periodLoading}
            courseLoading={courseLoading}
            courseError={courseError}
            termError={termError}
            onCancel={() => setView("myclaims")}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            user={currentUser}
          />
        );
      }

      case "detail":
        return (
          <ClaimDetail
            claim={selectedClaim}
            course={courses.find(
              (course) => course.code === selectedClaim?.courseCode,
            )}
            goBack={() => setView("myclaims")}
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
            onOpenClaims={openMyClaims}
          />
        );

      case "notifications":
        return (
          <Notifications
            notifications={notifications}
            readIds={readIds}
            onRead={markRead}
            onReadAll={() => markRead(notifications.map((n) => n.id))}
            goDetail={goDetail}
          />
        );

      case "contact":
        return (
          <Contact user={currentUser} onDone={() => setView("home")} />
        );

      default:
        return <Home query={search} isLoggedIn={isLoggedIn} goCreate={goCreate} onLogin={goLoginThenCreate} rounds={rounds} />;
    }
  };

  /*
   * หน้า Login แยกต่างหาก (ไม่ใช่ popup)
   * ถ้ายังไม่ล็อกอินแล้วเข้าหน้าที่ต้องล็อกอิน จะแสดงหน้า Login แทน
   * และล็อกอินเสร็จแล้วพากลับไปหน้าที่ตั้งใจจะเข้า
   *
   * หมายเหตุ: เป็นการกันฝั่ง frontend เพื่อการใช้งานเท่านั้น
   * ความปลอดภัยจริงต้องให้ API ตรวจ token จาก Cognito
   */
  if (authLoading) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center"
        style={{
          background: C.bg,
          color: C.tealDark,
        }}
      >
        <p className="text-sm font-semibold">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  const needsLogin = !isLoggedIn && PROTECTED_VIEWS.has(view);

  if (view === "login" || needsLogin) {
    return (
      <Login
        notice={needsLogin ? "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้" : ""}
        onBack={() => {
          setAfterLoginView(null);
          setView("home");
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setView(needsLogin ? view : afterLoginView || "home");
          setAfterLoginView(null);
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
        subtitle={SUBTITLE_MAP[view] || "ระบบเบิกค่าสอน"}
        searchQuery={search}
        onSearchChange={setSearch}
        onSearchSelect={handleSearchSelect}
        onProfileClick={() => setView("login")}
        isLoggedIn={isLoggedIn}
        user={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setView("profile")}
        isHome={view === "home"}
        showBell={view !== "contact"}
        unreadCount={unreadCount}
        onBellClick={() => setView("notifications")}
        onContactClick={() => setView("contact")}
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
          onCloseMobile={() => setMobileOpen(false)}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          onLogin={() => setView("login")}
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

            ${collapsed ? "md:ml-[84px]" : "md:ml-[280px]"}
          `}
        >
          <main className="flex-1 overflow-y-auto">
            <div className="p-5 md:p-9">{renderPage()}</div>

            {view === "home" && (
              <Footer onContactClick={() => setView("contact")} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}