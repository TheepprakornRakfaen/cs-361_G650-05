import { getIdToken } from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL;

async function apiRequest(
  path,
  options = {}
) {
  const token =
    await getIdToken();

  if (!token) {
    throw new Error("NO_AUTH_TOKEN");
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            token,

          ...options.headers,
        },
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    // response อาจไม่มี JSON
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.message ||
        `API error ${response.status}`
      );

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  return data;
}

/*
 * User
 */
export function syncCurrentUser() {
  return apiRequest(
    "/api/auth/me",
    {
      method: "POST",
    }
  );
}

/*
 * Claims
 */
export function getClaims() {
  return apiRequest(
    "/api/claims",
    {
      method: "GET",
    }
  );
}

export function createClaim(
  claim
) {
  return apiRequest(
    "/api/claims",
    {
      method: "POST",

      body:
        JSON.stringify(
          claim
        ),
    }
  );
}

/*
 * Courses
 */
export function getCourses() {
  return apiRequest(
    "/api/courses",
    {
      method: "GET",
    }
  );
}

/*
 * Submission periods
 */
export function getPeriods() {
  return apiRequest(
    "/api/period",
    {
      method: "GET",
    }
  );
}

/*
 * Academic terms
 */
export function getTerms() {
  return apiRequest(
    "/api/term",
    {
      method: "GET",
    }
  );
}