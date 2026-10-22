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
import { applyProfileEdits } from "./data/profile";
import Contact from "./pages/Contact";
import Notifications from "./pages/Notifications";
import ReviewQueue from "./pages/ReviewQueue";
import AdminOverview from "./pages/AdminOverview";
import AuditLog from "./pages/AuditLog";
import AccessControl from "./pages/AccessControl";
import NotFound from "./pages/NotFound";
import AccessDenied from "./components/AccessDenied";

import {
  canAccessQueue,
  canAccessView,
  getLandingView,
  isClaimant,
} from "./data/roles";

import { STATUS, normalizeStatus } from "./data/workflow";

import {
  loadState,
  saveState,
  addClaim,
  updateClaimFromForm,
  deleteClaim as deleteLocalClaim,
} from "./data/store";

import {
  getAuthenticatedUser,
  logoutFromCognito,
} from "./services/auth";

import {
  buildNotifications,
  loadReadIds,
  saveReadIds,
} from "./data/notifications";

import {
  syncCurrentUser,
  getTerms,
  getPeriods,
  getCourses,
  getClaims,
  createClaim,
  deleteClaim,
  submitClaimAction,
  resubmitClaim,
  AUTH_EXPIRED_EVENT,
} from "./services/api";

import { uploadAndRegisterEvidence } from "./services/evidence";

import {
  buildClaimApiPayload,
  buildClaimCode,
  normalizeClaimsResponse,
} from "./services/claimMapper";

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
  admin: "ภาพรวมระบบ",
  review: "ตรวจสอบ / อนุมัติ",
  auditlog: "ประวัติการดำเนินการ",
  settings: "บทบาทและสิทธิ์",
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
  "admin",
  "review",
  "auditlog",
  "settings",
]);

export default function App() {
  const [view, setView] = useState("home");

  /*
   * ตัวกรองสถานะตอนเปิดหน้า "คำขอของฉัน" จากที่อื่น
   * เช่น กดการ์ด "แบบร่าง" ในหน้าโปรไฟล์ → แสดงเฉพาะแบบร่าง
   */
  const [myClaimsFilter, setMyClaimsFilter] = useState("All");

  // ตัวกรองสถานะตอนเปิดคิวตรวจสอบจากหน้าภาพรวมระบบ (null = ค่าเริ่มต้นของหน้า)
  const [reviewFilter, setReviewFilter] = useState(null);

  const openReview = (status = null) => {
    setReviewFilter(status);
    setView("review");
  };

  const openMyClaims = (status = "All") => {
    setMyClaimsFilter(status);
    setView("myclaims");
  };

  // ออกจากหน้าคำขอของฉันแล้ว รอบหน้าเปิดจากเมนูให้กลับมาแสดงทั้งหมด
  useEffect(() => {
    if (view !== "myclaims") {
      setMyClaimsFilter("All");
    }

    // ออกจากคิวแล้วกลับเข้าทางเมนู → ใช้ตัวกรองเริ่มต้น (ยกเว้นไปดูรายละเอียดแล้วกดย้อนกลับ)
    if (view !== "review" && view !== "detail") {
      setReviewFilter(null);
    }
  }, [view]);

  const [collapsed, setCollapsed] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [selectedClaimId, setSelectedClaimId] = useState(null);

  const [presetSectionId, setPresetSectionId] = useState(null);

  const [presetCourse, setPresetCourse] = useState("");

  const [presetRound, setPresetRound] = useState(null);

  // หน้าที่จะพาไปหลังล็อกอินสำเร็จ (เช่น กดปุ่ม "เข้าสู่ระบบเพื่อยื่นคำขอ" จากหน้าแรก)
  const [afterLoginView, setAfterLoginView] = useState(null);

  // ออกจากขั้นตอนสร้างคำขอแล้วให้ล้างค่าที่จำไว้ ไม่ให้ค้างไปรอบถัดไป
  useEffect(() => {
    if (!["create", "rounds", "claim-create"].includes(view)) {
      setPresetCourse("");
      setPresetSectionId(null);
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
  const [allPeriods, setAllPeriods] = useState([]);
  const [allPeriodsLoading, setAllPeriodsLoading] = useState(false);
  const [allPeriodsError, setAllPeriodsError] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [apiCourses, setApiCourses] = useState([]);

  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState("");
  const [periodLoading, setPeriodLoading] = useState(false);

  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState("");

  const loadTerms =
    async () => {
      setTermLoading(true);
      setTermError("");

      try {
        const data =
          await getTerms();

        const nextTerms =
          Array.isArray(
            data?.terms
          )
            ? data.terms
            : Array.isArray(data)
              ? data
              : [];

        setTerms(
          nextTerms
        );

        return nextTerms;
      } catch (error) {
        console.error(
          "Load terms error:",
          error
        );

        setTerms([]);

        setTermError(
          error?.message ||
          "ไม่สามารถโหลดภาคการศึกษาได้"
        );

        return [];
      } finally {
        setTermLoading(false);
      }
    };

  const loadPeriods =
    async (termId) => {
      if (!termId) {
        setPeriods([]);
        setSelectedPeriodId(
          null
        );

        return [];
      }

      setPeriodLoading(true);
      setTermError("");

      try {
        const data =
          await getPeriods(
            termId
          );

        const nextPeriods =
          Array.isArray(
            data?.periods
          )
            ? data.periods
            : Array.isArray(data)
              ? data
              : [];

        setPeriods(
          nextPeriods
        );

        return nextPeriods;
      } catch (error) {
        console.error(
          "Load periods error:",
          error
        );

        setPeriods([]);

        setSelectedPeriodId(
          null
        );

        setTermError(
          error?.message ||
          "ไม่สามารถโหลดรอบการยื่นได้"
        );

        return [];
      } finally {
        setPeriodLoading(false);
      }
    };

  // โหลดรอบการยื่นของทุกภาคการศึกษาพร้อมกัน
  const loadAllPeriods = async (termList = terms) => {
    if (!Array.isArray(termList) || termList.length === 0) {
      setAllPeriods([]);
      return;
    }

    setAllPeriodsLoading(true);
    setAllPeriodsError("");

    /*
     * ใช้ allSettled: ภาคไหนโหลดไม่สำเร็จ (เช่น backend ตอบ 500) ไม่ทำให้ภาคอื่นหายไปด้วย
     */
    const results = await Promise.allSettled(
      termList.map(async (term) => {
        const data = await getPeriods(term.id);

        const list = Array.isArray(data?.periods)
          ? data.periods
          : Array.isArray(data)
            ? data
            : [];

        // กันกรณี API ไม่ส่ง term_id กลับมา
        return list.map((period) => ({
          ...period,
          term_id: period.term_id ?? term.id,
        }));
      })
    );

    const loaded = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const failedTerms = termList.filter(
      (_, index) => results[index].status === "rejected"
    );

    failedTerms.forEach((term, i) =>
      console.error(
        `Load periods failed for term ${term.semester}/${term.year}:`,
        results.filter((r) => r.status === "rejected")[i]?.reason
      )
    );

    setAllPeriods(loaded);

    if (failedTerms.length > 0) {
      const names = failedTerms
        .map((term) => `${term.semester}/${term.year}`)
        .join(", ");

      setAllPeriodsError(
        loaded.length > 0
          ? `โหลดรอบของบางภาคการศึกษาไม่สำเร็จ (${names}) — แสดงเฉพาะภาคที่โหลดได้`
          : `ไม่สามารถโหลดรอบการยื่นได้ (${names})`
      );
    }

    setAllPeriodsLoading(false);
  };

  // เข้าหน้ารอบการยื่นเมื่อไหร่ โหลดรอบของทุกภาคใหม่ให้ข้อมูลสด
  useEffect(() => {
    if (
      (view === "create" || view === "rounds") &&
      terms.length > 0
    ) {
      loadAllPeriods(terms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, terms]);

  const loadCourses =
    async (termId) => {
      if (!termId) {
        setApiCourses([]);
        setCourseError("");

        return [];
      }

      setCourseLoading(true);
      setCourseError("");

      try {
        const data =
          await getCourses(
            termId
          );

        const nextCourses =
          Array.isArray(
            data?.courses
          )
            ? data.courses
            : Array.isArray(data)
              ? data
              : [];

        setApiCourses(
          nextCourses
        );

        return nextCourses;
      } catch (error) {
        console.error(
          "Load courses error:",
          error
        );

        setApiCourses([]);

        setCourseError(
          error?.message ||
          "ไม่สามารถโหลดรายวิชาได้"
        );

        return [];
      } finally {
        setCourseLoading(false);
      }
    };

  const handleTermChange =
    async (termId) => {
      setSelectedTermId(
        termId
      );

      setPeriods([]);

      setSelectedPeriodId(
        null
      );

      setApiCourses([]);

      if (!termId) {
        return;
      }

      try {
        await Promise.all([
          loadPeriods(
            termId
          ),

          loadCourses(
            termId
          ),
        ]);
      } catch (error) {
        console.error(
          "Load term-dependent data error:",
          error
        );
      }
    };

  const [apiClaims, setApiClaims] = useState([]);

  const [claimsLoading, setClaimsLoading,] = useState(false);

  const [claimsError, setClaimsError] = useState("");

  const loadClaims =
    async () => {
      setClaimsLoading(true);
      setClaimsError("");

      try {
        const data =
          await getClaims();

        const nextClaims =
          normalizeClaimsResponse(
            data
          );

        setApiClaims(
          nextClaims
        );

        return nextClaims;
      } catch (error) {
        console.error(
          "Load claims error:",
          error
        );

        setClaimsError(
          error?.message ||
          "ไม่สามารถโหลดคำขอได้"
        );

        return [];
      } finally {
        setClaimsLoading(false);
      }
    };
  /*
   * [V3] คิวตรวจสอบ/อนุมัติ — backend เป็นผู้กำหนดว่าเห็นคำขอของใครได้บ้าง
   * แยก state จาก "คำขอของฉัน" เพื่อไม่ให้คำขอของผู้อื่นไปโผล่ในหน้าของตัวเอง
   */
  const [reviewClaims, setReviewClaims] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // หน้ารายละเอียดเปิดมาจากที่ไหน (ใช้กำหนดปุ่มย้อนกลับ/เมนูที่ไฮไลต์)
  const [detailFrom, setDetailFrom] = useState("myclaims");

  // ข้อความบนหน้า Login เมื่อถูกเด้งออก (เช่น เซสชันหมดอายุ)
  const [loginNotice, setLoginNotice] = useState("");

  const loadReviewClaims =
    async () => {
      setReviewLoading(true);
      setReviewError("");

      try {
        const data =
          await getClaims("review");

        const next =
          normalizeClaimsResponse(
            data
          );

        setReviewClaims(next);

        return next;
      } catch (error) {
        console.error(
          "Load review queue error:",
          error
        );

        setReviewClaims([]);

        setReviewError(
          error?.status === 403
            ? "คุณไม่มีสิทธิ์ดูคิวตรวจสอบ"
            : error?.message ||
              "ไม่สามารถโหลดคิวตรวจสอบได้"
        );

        return [];
      } finally {
        setReviewLoading(false);
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
   * [V3] token หมดอายุ / ถูกเพิกถอน (API ตอบ 401)
   * → ออกจากระบบ ล้างข้อมูลในหน้าจอ แล้วพาไปหน้า Login พร้อมแจ้งเหตุผล
   */
  useEffect(() => {
    const onExpired = async () => {
      try {
        await logoutFromCognito();
      } catch {
        /* session หมดอยู่แล้ว */
      }

      setCurrentUser(null);
      setLoginNotice(
        "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง"
      );
      setView("login");
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

    return () =>
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

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
          setCurrentUser(applyProfileEdits(user));
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
      setApiClaims([]);
      setPendingEvidence({});
      setReviewClaims([]);
      setTerms([]);
      setPeriods([]);
      setApiCourses([]);
      setSelectedTermId(
        null
      );
      setSelectedPeriodId(
        null
      );

      return;
    }

    let active = true;

    async function bootstrap() {
      /*
      * Sync Cognito user
      * กับ backend
      */
      try {
        await syncCurrentUser();
      } catch (error) {
        console.error(
          "User sync failed:",
          error
        );
      }

      /*
      * Claims กับ Terms
      * โหลดพร้อมกันได้
      */
      const [
        nextTerms,
      ] =
        await Promise.all([
          loadTerms(),

          isClaimant(currentUser)
            ? loadClaims().catch(
                () => []
              )
            : Promise.resolve([]),

          canAccessQueue(currentUser)
            ? loadReviewClaims().catch(
                () => []
              )
            : Promise.resolve([]),
        ]);

      if (
        !active ||
        nextTerms.length === 0
      ) {
        return;
      }

      /*
      * หา term ปัจจุบัน
      * 1) flag จาก backend
      * 2) term ที่วันนี้อยู่ในช่วง start_date–end_date
      * 3) term ล่าสุด (id มากสุด)
      */
      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      const termByDate =
        nextTerms.find(
          (term) =>
            term.start_date &&
            term.end_date &&
            String(term.start_date).slice(0, 10) <= today &&
            String(term.end_date).slice(0, 10) >= today
        );

      const latestTerm =
        [...nextTerms].sort(
          (a, b) =>
            Number(b.id) -
            Number(a.id)
        )[0];

      const defaultTerm =
        nextTerms.find(
          (term) =>
            term.is_current ===
              true ||
            term.is_active ===
              true ||
            String(
              term.status ||
                ""
            ).toUpperCase() ===
              "OPEN"
        ) ||
        termByDate ||
        latestTerm;

      const termId =
        Number(
          defaultTerm.id
        );

      setSelectedTermId(
        termId
      );

      await Promise.all([
        loadPeriods(
          termId
        ),

        loadCourses(
          termId
        ),
      ]);
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const [state, setState] = useState(() => loadState());

  /*
   * บันทึก localStorage ทุกครั้งที่ state เปลี่ยน
   */
  const localDrafts =
    Array.isArray(
      state?.claims
    )
      ? state.claims.filter(
          (claim) =>
            claim.status ===
              "Draft" &&
            currentUser &&
            claim.owner ===
              currentUser.username
        )
      : [];

  /*
   * เติมภาค ("1/2569") กับรหัสคำขอที่อ่านง่าย
   * ใช้ทั้งคำขอของฉัน และคิวตรวจสอบ
   */
  const decorateClaim = (claim) => {
    /*
    * เติมภาค ("1/2569") กับรหัสคำขอที่อ่านง่าย
    * ใช้ในตาราง คำขอของฉัน / หน้ารายละเอียด / แจ้งเตือน
    */
    const term = terms.find(
      (item) =>
        String(item.id) ===
        String(claim.termId)
    );

    const termLabel =
      term
        ? `${term.semester}/${term.year}`
        : claim.semester || "";

    const period = periods.find(
      (item) =>
        String(item.id) ===
        String(claim.periodId)
    );

    return {
      ...claim,

      termLabel,

      code: buildClaimCode({
        id: claim.id,
        courseCode: claim.courseCode,
        termLabel,
        periodMonth:
          claim.period_month ??
          period?.month,
        submittedAt:
          claim.submittedAt ||
          claim.createdAt,
      }),
    };
  };

  /*
  * API Claims + local Draft
  *
  * local Draft เป็น temporary
  * จนกว่า #24 backend จะเสร็จ
  */
  const claims = [
    ...localDrafts,
    ...apiClaims.filter(
      (apiClaim) =>
        !localDrafts.some(
          (draft) =>
            String(
              draft.id
            ) ===
            String(
              apiClaim.id
            )
        )
    ),
  ].sort((a, b) => {
    const aTime =
      new Date(
        a.createdAt || 0
      ).getTime();

    const bTime =
      new Date(
        b.createdAt || 0
      ).getTime();

    return bTime - aTime;
  }).map(decorateClaim);

  /*
  * Courses จาก Teaching Assignment API
  */
  const courses =
    apiCourses.map(
      (course) => {
        const role =
          course.role || "";

        return {
          ...course,

          sectionId:
            course.section_id ??
            course.sectionId ??
            course.id,

          code:
            course.course_code ??
            course.code ??
            "",

          name:
            course.course_name_th ??
            course.course_name_en ??
            course.name ??
            "",

          position:
            role,

          positionLabel:
            role ===
            "INSTRUCTOR"
              ? "อาจารย์ผู้สอน"
              : role === "TA"
                ? "ผู้ช่วยสอน (TA)"
                : role ||
                  "ไม่ระบุตำแหน่ง",

          used:
            Number(
              course.hour ??
              course.used ??
              0
            ),

          quota:
            Number(
              course.max_hour ??
              course.quota ??
              45
            ),

          remaining:
            Number(
              course.remaining_hour ??
              course.remaining ??
              Math.max(
                Number(
                  course.max_hour ??
                    45
                ) -
                  Number(
                    course.hour ??
                      0
                  ),
                0
              )
            ),

          rate:
            Number(
              course.rate ||
              0
            ),
        };
      }
    );

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

  const mapPeriodToRound = (period) => {
    const formatDate = (
      value
    ) => {
      if (!value) {
        return "";
      }

      const date = new Date(value);

      // วันที่เพี้ยนจาก API ต้องไม่ทำให้หน้าพัง
      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return new Intl.DateTimeFormat(
        "th-TH",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(date);
    };

    /*
     * Database:
     * 0 = Closed
     * 1 = Open
     *
     * รองรับกรณี API ส่ง
     * number / string / "OPEN"
     */
    const statusValue =
      String(
        period.status ?? ""
      )
        .trim()
        .toUpperCase();

    const statusEnabled =
      period.status === 1 ||
      period.status === "1" ||
      statusValue === "OPEN";

    /*
     * ตรวจช่วงเวลาเปิดจริงด้วย
     */
    const now =
      new Date();

    const openAt =
      period.open_at
        ? new Date(
            period.open_at
          )
        : null;

    const closeAt =
      period.close_at
        ? new Date(
            period.close_at
          )
        : null;

    const withinPeriod =
      (!openAt ||
        now >= openAt) &&
      (!closeAt ||
        now <= closeAt);

    const isOpen =
      statusEnabled &&
      withinPeriod;

    const term = terms.find(
      (item) =>
        String(item.id) === String(period.term_id)
    );

    return {
      id:
        period.id,

      termId:
        period.term_id,

      // ปีการศึกษา / ภาคการศึกษา ใช้ค้นหาและจัดกลุ่มในหน้ารอบการยื่น
      year:
        term?.year != null ? String(term.year) : "",

      semester:
        term?.semester != null ? String(term.semester) : "",

      termLabel:
        term ? `${term.semester}/${term.year}` : "",

      month:
        period.month,

      label:
        period.label ||
        `รอบเดือน ${
          period.month || "-"
        }`,

      period:
        `${formatDate(
          period.open_at
        )} - ${formatDate(
          period.close_at
        )}`,

      deadline:
        formatDate(
          period.close_at
        ),

      openAt:
        period.open_at,

      closeAt:
        period.close_at,

      status:
        isOpen
          ? "Open"
          : "Closed",
    };
  };


  const rounds = periods.map(mapPeriodToRound);

  // รอบการยื่นของทุกภาคการศึกษา (ไว้ให้หน้ารอบการยื่นค้นหาข้ามปีได้)
  const allRounds = allPeriods.map(mapPeriodToRound);

  // ภาคที่เลือกอยู่ เช่น "1/2569"
  const currentTermLabel = (() => {
    const term = terms.find(
      (item) =>
        String(item.id) ===
        String(selectedTermId)
    );

    return term
      ? `${term.semester}/${term.year}`
      : "";
  })();

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
    setPresetSectionId(null);
  };

  /*
   * สร้างคำขอจากรายวิชา
   */
  const goCreateFor =
    (course) => {
      setPresetCourse(
        course?.code ||
        course?.course_code ||
        ""
      );

      setPresetSectionId(
        course?.sectionId ??
        course?.section_id ??
        null
      );

      setPresetRound(null);
      setEditingClaimId(null);

      setView("create");
    };

  /*
   * สร้างคำขอจากรอบ
   */
  const goCreateForRound = async (round) => {
    setPresetRound(round);
    setEditingClaimId(null);
    setView("claim-create");

    // รอบอาจอยู่คนละภาคกับที่เลือกอยู่ → สลับภาค (โหลดวิชา/รอบของภาคนั้น) ก่อนเลือกรอบ
    if (
      round?.termId &&
      String(round.termId) !== String(selectedTermId)
    ) {
      await handleTermChange(round.termId);
    }

    setSelectedPeriodId(Number(round?.id) || null);
  };

  /*
   * คำขอที่ยื่นไปแล้วของรอบนี้ (ไม่นับแบบร่าง) เรียงล่าสุดก่อน
   * รอบเดียวยื่นได้หลายคำขอจนครบชั่วโมง (ห้ามใช้วันสอนซ้ำ — ตรวจใน CreateClaim)
   */
  const findRoundClaims = (round) =>
    round
      ? claims
          .filter(
            (claim) =>
              String(claim.periodId) === String(round.id) &&
              claim.status !== STATUS.DRAFT &&
              claim.status !== STATUS.UNKNOWN
          )
          .sort((a, b) =>
            String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
          )
      : [];

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
   * ออกจากระบบทุกอุปกรณ์ (เพิกถอน token ทั้งหมด)
   */
  const handleLogoutAll = async () => {
    try {
      await logoutFromCognito({ global: true });
    } catch (error) {
      console.error("Global logout error:", error);
      alert("ออกจากระบบทุกอุปกรณ์ไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    setCurrentUser(null);
    setView("home");
  };

  /*
   * เปิดรายละเอียดคำขอ
   */
  const goDetail = (id, from = "myclaims") => {
    setSelectedClaimId(id);
    setDetailFrom(from);
    setView("detail");
  };

  const goReviewDetail = (id) => goDetail(id, "review");

  /*
   * [V3] ตรวจสอบผ่าน / อนุมัติ / ไม่อนุมัติ / ส่งกลับแก้ไข
   * โยน error ต่อให้กล่องยืนยันแสดง (เช่น 403, 409 สถานะเปลี่ยนไปแล้ว)
   * หลังสำเร็จโหลดข้อมูลใหม่จาก backend เสมอ ไม่เดาสถานะเอง
   */
  /*
   * ไฟล์แนบที่ยังค้าง (อัปโหลด/บันทึกไม่สำเร็จ) แยกตาม claimId
   * เก็บ File ไว้ในหน่วยความจำ เพื่อกด "ลองอีกครั้ง" ได้โดยไม่ต้องเลือกไฟล์ใหม่
   * (รีเฟรชหน้าแล้วหาย — ผู้ใช้ยังกด "แนบไฟล์เพิ่ม" เลือกไฟล์ใหม่ได้)
   */
  const [pendingEvidence, setPendingEvidence] = useState({});

  // entries = File[] (แนบเพิ่ม) หรือรายการค้าง (ลองใหม่) → คืนผลให้ ClaimDetail รีโหลดรายการ
  const handleAttachEvidence = async (claimId, entries) => {
    const result = await uploadAndRegisterEvidence(claimId, entries);

    setPendingEvidence((current) => {
      const next = { ...current };
      const retriedNames = new Set(
        entries.map((entry) => (entry instanceof File ? entry.name : entry?.fileName))
      );

      // ตัดรายการที่ลองรอบนี้ออก แล้วใส่เฉพาะที่ยังพลาดกลับเข้าไป
      const remaining = (current[claimId] || []).filter(
        (item) => !retriedNames.has(item.fileName)
      );
      const merged = [...remaining, ...result.failed];

      if (merged.length > 0) {
        next[claimId] = merged;
      } else {
        delete next[claimId];
      }

      return next;
    });

    return result;
  };

  const handleClaimAction = async (claimId, action, comment, extra) => {
    try {
      await submitClaimAction(claimId, action, comment, extra);
    } catch (error) {
      if (error?.status === 409) {
        // มีคนดำเนินการไปก่อน → ดึงสถานะล่าสุดมาแสดง
        await loadReviewClaims();

        throw new Error(
          "สถานะของคำขอเปลี่ยนไปแล้ว ระบบอัปเดตข้อมูลล่าสุดให้แล้ว กรุณาตรวจสอบอีกครั้ง"
        );
      }

      throw error;
    }

    await Promise.all([
      loadReviewClaims(),
      isClaimant(currentUser) ? loadClaims() : Promise.resolve(),
    ]);
  };

  /*
   * Submit คำขอ (สร้างใหม่ หรือยื่นคำขอที่แก้ไข)
   */
  const handleSubmit = async (form, evidenceFiles = []) => {
    try {
      /*
      * STEP 1
      * ตอนนี้ยังไม่ map ตาม API Gateway Model
      * เพราะ Model ไม่ได้ใช้แล้ว
      *
      * ส่ง form ไปดู contract ของ Lambda จริงก่อน
      */
      const payload =
      buildClaimApiPayload(
        form
      );

      console.log(
        "POST /api/claims payload:",
        payload
      );

      /*
      * STEP 2
      * Create Claim
      */
      const returnedClaim =
        editingClaimId
          ? apiClaims.find(
              (item) =>
                String(item.id) ===
                String(editingClaimId) &&
                item.status ===
                  STATUS.RETURNED
            )
          : null;

      /*
       * [V3] คำขอที่ถูกส่งกลับ → ยื่นใหม่บนคำขอเดิม (ไม่สร้างใหม่)
       * เพื่อให้ประวัติการตรวจสอบต่อเนื่องในคำขอเดียว
       */
      const claimResponse =
        returnedClaim
          ? await resubmitClaim(
              returnedClaim.id,
              payload
            ).then(
              (response) =>
                response || {
                  claimId:
                    returnedClaim.id,
                }
            )
          : await createClaim(
              payload
            );

      console.log(
        "POST /api/claims response:",
        claimResponse
      );

      /*
      * STEP 3
      * ดึง claimId
      */
      const claimId =
        getClaimIdFromResponse(
          claimResponse
        );

      if (!claimId) {
        throw new Error(
          "Backend สร้าง Claim แล้ว แต่ไม่ได้คืน claimId"
        );
      }

      console.log(
        "Created claimId:",
        claimId
      );

      /*
      * STEP 4
      * Upload + register Evidence
      *
      * คำขอถูกสร้างแล้วในขั้นนี้ จึง "ห้ามโยน error" ถ้าไฟล์บางไฟล์พลาด
      * ไม่งั้นผู้ใช้จะค้างที่ฟอร์ม กดยื่นซ้ำแล้วได้คำขอซ้ำ และไฟล์ที่ขึ้น S3 แล้ว
      * จะไม่ถูกบันทึก metadata (หน้ารายละเอียดมองไม่เห็น)
      * → บันทึกทุกไฟล์ที่สำเร็จ แล้วเก็บไฟล์ที่พลาดไว้ให้กดลองใหม่ในหน้ารายละเอียด
      */
      const uploadResult =
        evidenceFiles.length > 0
          ? await uploadAndRegisterEvidence(
              claimId,
              evidenceFiles
            )
          : { registered: [], failed: [] };

      if (evidenceFiles.length > 0) {
        console.log(
          "Evidence result:",
          {
            registered:
              uploadResult.registered.length,
            failed:
              uploadResult.failed.length,
          }
        );
      }

      setPendingEvidence((current) => {
        const next = { ...current };

        if (uploadResult.failed.length > 0) {
          next[claimId] = uploadResult.failed;
        } else {
          delete next[claimId];
        }

        return next;
      });

      /*
      * STEP 5
      * สร้าง Claim สำหรับแสดงบน UI
      * ทันทีโดยไม่ต้องรอ GET
      */
      const createdClaim = {
        ...form,

        id:
          claimId,

        claimId,

        evidence:
          uploadResult.registered.length > 0
            ? uploadResult.registered
                .map((item) => item.fileName)
                .join(", ")
            : form.fileName || "",

        evidenceFiles:
          uploadResult.registered,

        status:
          (claimResponse?.status != null &&
            normalizeStatus(claimResponse.status) !==
              STATUS.UNKNOWN &&
            normalizeStatus(claimResponse.status)) ||
          STATUS.SUBMITTED,

        createdAt:
          claimResponse?.created_at ||
          claimResponse?.createdAt ||
          new Date().toISOString(),
      };

      /*
      * STEP 6
      * เพิ่ม Claim ใน state
      */
      setApiClaims(
        (current) => [
          createdClaim,

          ...current.filter(
            (claim) =>
              String(
                claim.id ??
                claim.claimId ??
                claim.claim_id
              ) !==
              String(
                claimId
              )
          ),
        ]
      );

      /*
      * STEP 6.1
      * ถ้ายื่นจากแบบร่างเดิม → ลบแบบร่างนั้นทิ้ง
      * ไม่งั้นจะมีทั้งร่างเก่าและคำขอที่ยื่นแล้วซ้อนกัน
      */
      if (editingClaimId) {
        const isLocalDraft =
          localDrafts.some(
            (draft) =>
              String(draft.id) ===
              String(editingClaimId)
          );

        if (isLocalDraft) {
          setState(
            deleteLocalClaim(editingClaimId)
          );
        } else {
          const oldClaim = apiClaims.find(
            (item) =>
              String(item.id) ===
              String(editingClaimId)
          );

          // ร่างที่อยู่ใน backend → ลบผ่าน API (ถ้าลบไม่ได้ก็ไม่ให้การยื่นล้ม)
          if (
            oldClaim?.status === "Draft" &&
            String(oldClaim.id) !== String(claimId)
          ) {
            try {
              await deleteClaim(
                oldClaim.id,
                currentUser?.cognitoSub
              );

              setApiClaims((current) =>
                current.filter(
                  (item) =>
                    String(item.id) !==
                    String(oldClaim.id)
                )
              );
            } catch (error) {
              console.error(
                "Submitted but old draft delete failed:",
                error
              );
            }
          }
        }
      }

      /*
      * STEP 7
      * ลอง refresh Claim จริงจาก backend
      *
      * ถ้าพัง เราก็ยังมี createdClaim
      * ให้หน้า Detail ใช้อยู่
      */
      // ไม่รอ — ไปหน้ารายละเอียดได้เลย แล้วค่อยอัปเดตรายการตามหลัง
      Promise.resolve(loadClaims()).catch((error) => {
        console.error(
          "Claim created but GET /api/claims refresh failed:",
          error
        );
      });

      setEditingClaimId(
        null
      );

      setSelectedClaimId(
        claimId
      );

      setView(
        "detail"
      );

      // บางไฟล์ไม่สำเร็จ → หน้ารายละเอียดแสดงแถบแจ้งพร้อมปุ่ม "ลองอีกครั้ง"
      if (uploadResult.failed.length > 0) {
        alert(
          `ยื่นคำขอเรียบร้อยแล้ว แต่แนบไฟล์ไม่สำเร็จ ${uploadResult.failed.length} ไฟล์\n` +
            "กดปุ่ม “ลองอีกครั้ง” ในหน้ารายละเอียดคำขอได้เลย"
        );
      }
    } catch (error) {
      console.error(
        "Submit claim failed:",
        error
      );

      alert(
        error?.data?.message ||
        error?.message ||
        "ไม่สามารถยื่นคำขอได้"
      );
    }
  };

  /*
   * ลบคำขอ
   * - ร่างใน localStorage → ลบในเครื่อง
   * - คำขอจาก backend → DELETE /api/claims (body: claim_id, cognito_sub)
   */
  const handleDeleteClaim = async (claim) => {
    // ลบได้เฉพาะแบบร่าง (คำขอที่ยื่นแล้วต้องเก็บไว้เพื่อตรวจสอบย้อนหลัง)
    if (claim.status !== STATUS.DRAFT) {
      alert("ลบได้เฉพาะแบบร่างเท่านั้น");
      return;
    }

    if (
      !window.confirm(
        `ต้องการลบคำขอ #${claim.id} ใช่หรือไม่?`
      )
    ) {
      return;
    }

    const isLocalDraft =
      localDrafts.some(
        (draft) =>
          String(draft.id) ===
          String(claim.id)
      );

    try {
      if (isLocalDraft) {
        setState(
          deleteLocalClaim(claim.id)
        );
      } else {
        await deleteClaim(
          claim.id,
          currentUser?.cognitoSub
        );

        setApiClaims((current) =>
          current.filter(
            (item) =>
              String(item.id) !==
              String(claim.id)
          )
        );
      }

      if (
        String(selectedClaimId) ===
        String(claim.id)
      ) {
        setSelectedClaimId(null);
      }
    } catch (error) {
      console.error(
        "Delete claim failed:",
        error
      );

      alert(
        error?.data?.message ||
        error?.message ||
        "ไม่สามารถลบคำขอได้"
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
  const handleSaveDraft = (form, evidenceFiles = []) => {
    /*
     * File object เก็บใน
     * localStorage ไม่ได้
     *
     * จึงไม่แกล้งเก็บชื่อไฟล์
     * แล้วทำเหมือนยังมีไฟล์อยู่
     */
    const draftForm = {
      ...form,
      fileName: "",
    };

    const savedClaim =
      editingClaimId
        ? updateClaimFromForm(
            editingClaimId,
            draftForm,
            "Draft"
          )
        : addClaim(
            draftForm,
            "Draft",
            currentUser?.username
          );

    if (!savedClaim) {
      alert(
        "ไม่สามารถบันทึกแบบร่างได้"
      );

      return;
    }

    if (evidenceFiles.length > 0) {
      alert(
        "บันทึกแบบร่างแล้ว แต่ไฟล์หลักฐานยังไม่ถูกบันทึก กรุณาเลือกไฟล์ใหม่ตอนกลับมาแก้ไข"
      );
    }

    const latestState =
      loadState();

    setState(
      latestState
    );

    setEditingClaimId(
      null
    );

    setSelectedClaimId(
      savedClaim.id
    );

    setView(
      "detail"
    );
  };

  /*
   * หาคำขอที่เลือก
   */
  const selectedClaim =
    claims.find((claim) => String(claim.id) === String(selectedClaimId)) ||
    reviewClaims
      .map(decorateClaim)
      .find((claim) => String(claim.id) === String(selectedClaimId)) ||
    null;

  /*
   * เปลี่ยนหน้า
   */
  const renderPage = () => {
    // [V3] ล็อกอินแล้วแต่บทบาทไม่มีสิทธิ์เข้าหน้านี้ → แจ้งชัดเจน ไม่ปล่อยให้เห็นหน้าว่าง/error
    if (isLoggedIn && !canAccessView(currentUser, view)) {
      return (
        <AccessDenied
          onBack={() => setView(getLandingView(currentUser))}
          backLabel="กลับหน้าหลัก"
        />
      );
    }

    switch (view) {
      case "home":
        return <Home query={search} isLoggedIn={isLoggedIn} goCreate={goCreate} onLogin={goLoginThenCreate} rounds={rounds} />;

      case "dashboard":
        return (
          <Dashboard
            user={currentUser}
            claims={claims}
            rounds={rounds}
            termLabel={currentTermLabel}
            goCreate={goCreate}
            goCreateForRound={goCreateForRound}
            findRoundClaims={findRoundClaims}
            goDetail={goDetail}
            goMyClaims={openMyClaims}
          />
        );

      case "assignments":
        return (
          <Assignments
            courses={apiCourses}
            claims={apiClaims}
            periods={periods}
            goCreateFor={goCreateFor}
            courseLoading={courseLoading}
            courseError={courseError}
          />
        );

      case "myclaims":
        return (
          <MyClaims
            claims={claims}
            currentTermLabel={currentTermLabel}
            termLabels={terms.map(
              (term) =>
                `${term.semester}/${term.year}`
            )}
            courseCodes={courses
              .map((course) => course.code)
              .filter(Boolean)}
            goDetail={goDetail}
            goCreate={goCreate}
            onDelete={handleDeleteClaim}
            onReload={loadClaims}
            loading={claimsLoading}
            initialStatus={myClaimsFilter}
          />
        );

      case "admin":
        return (
          <AdminOverview
            user={currentUser}
            claims={reviewClaims.map(decorateClaim)}
            termLabel={currentTermLabel}
            loading={reviewLoading}
            goReview={openReview}
            goDetail={goReviewDetail}
            goAuditLog={() => setView("auditlog")}
          />
        );

      case "review":
        return (
          <ReviewQueue
            key={reviewFilter || "default"}
            initialStatus={reviewFilter}
            user={currentUser}
            claims={reviewClaims.map(decorateClaim)}
            loading={reviewLoading}
            error={reviewError}
            onReload={loadReviewClaims}
            goDetail={goReviewDetail}
          />
        );

      case "auditlog":
        return (
          <AuditLog
            claims={reviewClaims.map(decorateClaim)}
            goDetail={goReviewDetail}
          />
        );

      case "settings":
        return <AccessControl user={currentUser} />;

      case "create":
      case "rounds":
        return (
          <CreateClaimList
            rounds={allRounds}
            terms={terms}
            loading={allPeriodsLoading || termLoading}
            error={allPeriodsError || termError}
            onReload={() => loadAllPeriods(terms)}
            courses={courses}
            goCreateForRound={goCreateForRound}
            findRoundClaims={findRoundClaims}
            goDetail={goDetail}
          />
        );

      case "claim-create": {
        const editingClaim = editingClaimId
          ? claims.find((claim) => String(claim.id) === String(editingClaimId))
          : null;

        return (
          <CreateClaim
            presetCourse={presetCourse}
            presetSectionId={presetSectionId}
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
            existingClaims={claims}
          />
        );
      }

      case "detail":
        return (
          <ClaimDetail
            claim={selectedClaim}
            course={
              courses.find(
                (course) =>
                  String(
                    course.sectionId
                  ) ===
                  String(
                    selectedClaim?.sectionId
                  )
              ) ||
              courses.find(
                (course) =>
                  course.code ===
                  selectedClaim?.courseCode
              )
            }
            user={currentUser}
            goBack={() =>
              setView(detailFrom === "review" ? "review" : "myclaims")
            }
            backLabel={
              detailFrom === "review"
                ? "กลับไปคิวตรวจสอบ"
                : "กลับไปคำขอของฉัน"
            }
            onEdit={goEditClaim}
            onAction={handleClaimAction}
            pendingEvidence={
              pendingEvidence[selectedClaim?.id] || []
            }
            onAttachEvidence={handleAttachEvidence}
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
            onUserUpdate={setCurrentUser}
            onLogoutAll={handleLogoutAll}
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
        return <NotFound onBack={() => setView("home")} />;
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
        notice={
          loginNotice ||
          (needsLogin ? "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้" : "")
        }
        onBack={() => {
          setAfterLoginView(null);
          setLoginNotice("");
          setView("home");
        }}
        onLoginSuccess={(user) => {
          const nextUser = applyProfileEdits(user);
          const wanted = needsLogin ? view : afterLoginView;

          setCurrentUser(nextUser);
          setLoginNotice("");

          /*
           * พาไปหน้าที่ตั้งใจจะเข้า ถ้าบทบาทเข้าได้
           * ไม่งั้นไปหน้าหลักของบทบาท (เช่น เจ้าหน้าที่ → คิวตรวจสอบ)
           */
          setView(
            wanted && canAccessView(nextUser, wanted)
              ? wanted
              : getLandingView(nextUser)
          );

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
          user={currentUser}
          detailFrom={detailFrom}
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
            print:!ml-0
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