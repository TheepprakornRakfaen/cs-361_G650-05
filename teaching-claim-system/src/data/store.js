import { COURSES } from "./mockData";

const STORAGE_KEY = "teaching-claim-system:v1";

const DEFAULT_STATE = {
  courses: COURSES,
  claims: [],
  rounds: [],
};

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        courses: COURSES,
        claims: [],
        rounds: [],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      courses:
        Array.isArray(parsed.courses) && parsed.courses.length > 0
          ? parsed.courses
          : COURSES,

      claims: Array.isArray(parsed.claims)
        ? parsed.claims
        : [],

      rounds: Array.isArray(parsed.rounds)
        ? parsed.rounds
        : [],
    };
  } catch (error) {
    console.error(
      "Cannot read localStorage:",
      error
    );

    return {
      ...DEFAULT_STATE,
    };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error(
      "Cannot save localStorage:",
      error
    );
  }
}

export function loadState() {
  return readState();
}

export function saveState(state) {
  writeState(state);
}

export function createClaimId(claims = []) {
  const year = new Date().getFullYear();

  const maxNumber = claims.reduce(
    (highest, claim) => {
      const match = String(
        claim.id || ""
      ).match(/(\d+)$/);

      if (!match) {
        return highest;
      }

      return Math.max(
        highest,
        Number(match[1])
      );
    },
    0
  );

  return `CL-${year}-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

function claimFieldsFromForm(form) {
  return {

    termId:
      form.termId || "",

    periodId:
      form.periodId || "",

    sectionId:
      form.sectionId || "",

    courseCode:
      form.courseCode?.trim() || "-",

    courseName:
      form.courseName?.trim() || "",

    semester:
      form.semester || "1/2569",

    round:
      form.round || "",

    month: form.teachingDate
      ? new Date(
          `${form.teachingDate}T00:00:00`
        ).toLocaleDateString(
          "th-TH",
          {
            month: "long",
            year: "numeric",
          }
        )
      : "-",

    teachingDate:
      form.teachingDate || "",

    // วันสอนแต่ละวัน [{ date, hours, minutes }] — teachingDate คือวันแรก
    sessions: Array.isArray(form.sessions)
      ? form.sessions
      : [],

    // ชั่วโมงรวมแบบทศนิยม (เช่น 3.5) คำนวณจาก sessions
    hours: Number(
      form.hours || 0
    ),

    rate: Number(
      form.rate || 0
    ),

    amount: Number(
      form.amount || 0
    ),

    notes:
      form.notes?.trim() || "",

    evidence:
      form.fileName || "",
  };
}

export function addClaim(form, status = "Pending", owner = "") {
  const state = readState();

  const claim = {
    id: createClaimId(state.claims),
    ...claimFieldsFromForm(form),
    // username ของคนที่สร้างคำขอ — ใช้กรองให้แต่ละคนเห็นเฉพาะคำขอของตัวเอง
    owner,
    status,
    createdAt:
      new Date().toISOString(),
  };

  state.claims = [
    claim,
    ...state.claims,
  ];

  writeState(state);

  return claim;
}

export function updateClaimFromForm(id, form, status) {
  const state = readState();

  let updatedClaim = null;

  state.claims = state.claims.map(
    (claim) => {
      if (
        String(claim.id) !==
        String(id)
      ) {
        return claim;
      }

      updatedClaim = {
        ...claim,
        ...claimFieldsFromForm(form),
        status:
          status || claim.status,
      };

      return updatedClaim;
    }
  );

  writeState(state);

  return updatedClaim;
}

export function deleteClaim(id) {
  const state = readState();

  state.claims =
    state.claims.filter(
      (claim) =>
        String(claim.id) !==
        String(id)
    );

  writeState(state);

  return state;
}

export function updateClaim(
  id,
  updates
) {
  const state = readState();

  state.claims =
    state.claims.map((claim) =>
      String(claim.id) ===
      String(id)
        ? {
            ...claim,
            ...updates,
          }
        : claim
    );

  writeState(state);

  return state;
}

export function deleteAllLocalData() {
  localStorage.removeItem(
    STORAGE_KEY
  );
}