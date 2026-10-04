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
  registerClaimEvidence,
} from "./services/api";

import { uploadClaimEvidenceFiles } from "./services/evidence";

import {
  buildClaimApiPayload,
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
      setApiClaims([]);
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

          loadClaims().catch(
            () => []
          ),
        ]);

      if (
        !active ||
        nextTerms.length === 0
      ) {
        return;
      }

      /*
      * หา term ปัจจุบัน
      * ถ้า backend ไม่มี flag
      * ใช้ตัวแรกเป็น fallback
      */
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
        nextTerms[0];

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
  });

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

  const rounds = periods.map(
  (period) => {
    const formatDate = (
      value
    ) => {
      if (!value) {
        return "";
      }

      return new Intl.DateTimeFormat(
        "th-TH",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(
        new Date(value)
      );
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

    return {
      id:
        period.id,

      termId:
        period.term_id,

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
  }
);

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
  const goCreateForRound =
    (round) => {
      setPresetRound(
        round
      );

      setSelectedPeriodId(
        Number(
          round?.id
        ) || null
      );

      setEditingClaimId(null);

      setView(
        "claim-create"
      );
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
      const claimResponse =
        await createClaim(
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
      * Upload Evidence
      */
      let uploadResult = { uploaded: [], failed: [] };

      if (evidenceFiles.length > 0) {
        /*
        * STEP 4.1
        * Upload ทุกไฟล์ไป S3
        */
        uploadResult =
          await uploadClaimEvidenceFiles(
            claimId,
            evidenceFiles
          );

        console.log(
          "Evidence upload result:",
          uploadResult
        );

        /*
        * ถ้ามีไฟล์ใด upload ไม่สำเร็จ
        * ไม่ register metadata ต่อ
        */
        if (
          uploadResult.failed.length > 0
        ) {
          const failedMessage =
            uploadResult.failed
              .map(
                (item) =>
                  `${item.fileName}: ${item.message}`
              )
              .join("\n");

          throw new Error(
            `อัปโหลดหลักฐานไม่สำเร็จ\n${failedMessage}`
          );
        }

        /*
        * STEP 4.2
        * หลัง S3 upload สำเร็จ
        * บันทึก metadata ลง PostgreSQL
        */
        for (
          const evidence of
          uploadResult.uploaded
        ) {
          const registered =
            await registerClaimEvidence(
              claimId,
              evidence
            );

          console.log(
            "Evidence registered:",
            registered
          );
        }
      }

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
          uploadResult.uploaded.length > 0
            ? uploadResult.uploaded
                .map((item) => item.fileName)
                .join(", ")
            : form.fileName || "",

        evidenceFiles:
          uploadResult.uploaded,

        status:
          claimResponse?.status ||
          "Submitted",

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
      * STEP 7
      * ลอง refresh Claim จริงจาก backend
      *
      * ถ้าพัง เราก็ยังมี createdClaim
      * ให้หน้า Detail ใช้อยู่
      */
      try {
        await loadClaims();
      } catch (error) {
        console.error(
          "Claim created but GET /api/claims refresh failed:",
          error
        );
      }

      setEditingClaimId(
        null
      );

      setSelectedClaimId(
        claimId
      );

      setView(
        "detail"
      );

      // คำขอถูกสร้างแล้ว แต่บางไฟล์อัปโหลดไม่สำเร็จ → แจ้งให้ชัดเจน
      if (uploadResult.failed.length > 0) {
        alert(
          "ยื่นคำขอแล้ว แต่อัปโหลดไฟล์ไม่สำเร็จ " +
            `${uploadResult.failed.length} ไฟล์:\n` +
            uploadResult.failed
              .map((item) => `- ${item.fileName}: ${item.message}`)
              .join("\n")
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
            onDelete={handleDeleteClaim}
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