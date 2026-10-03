import { getIdToken } from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    ""
  );

async function parseResponse(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function apiRequest(
  path,
  options = {}
) {
  if (!API_URL) {
    throw new Error(
      "VITE_API_URL is not configured"
    );
  }

  const {
    headers = {},
    body,
    ...fetchOptions
  } = options;

  const token =
    await getIdToken();

  if (!token) {
    throw new Error(
      "NO_AUTH_TOKEN"
    );
  }

  const finalHeaders = {
    Authorization: token,
    ...headers,
  };

  let requestBody = body;

  if (
    body !== undefined &&
    body !== null &&
    typeof body !== "string" &&
    !(body instanceof FormData)
  ) {
    finalHeaders[
      "Content-Type"
    ] = "application/json";

    requestBody =
      JSON.stringify(body);
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...fetchOptions,
        headers:
          finalHeaders,

        ...(body !== undefined
          ? {
              body:
                requestBody,
            }
          : {}),
      }
    );

  const data =
    await parseResponse(
      response
    );

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
 * =====================
 * Authentication / User
 * =====================
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
 * =====================
 * Claims
 * =====================
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
  payload
) {
  return apiRequest(
    "/api/claims",
    {
      method: "POST",
      body: payload,
    }
  );
}

/*
 * =====================
 * Terms
 * =====================
 */

export function getTerms() {
  return apiRequest(
    "/api/term",
    {
      method: "GET",
    }
  );
}

/*
 * =====================
 * Submission periods
 * =====================
 */

export function getPeriods(
  termId
) {
  const query =
    termId !== undefined &&
    termId !== null &&
    termId !== ""
      ? `?term_id=${encodeURIComponent(
          termId
        )}`
      : "";

  return apiRequest(
    `/api/period${query}`,
    {
      method: "GET",
    }
  );
}

/*
 * =====================
 * Teaching assignments
 * =====================
 */

export function getCourses(
  termId
) {
  const query =
    termId !== undefined &&
    termId !== null &&
    termId !== ""
      ? `?term_id=${encodeURIComponent(
          termId
        )}`
      : "";

  return apiRequest(
    `/api/courses${query}`,
    {
      method: "GET",
    }
  );
}