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
    throw new Error(
      "NO_AUTH_TOKEN"
    );
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
    data = null;
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

export async function syncCurrentUser() {
  return apiRequest(
    "/api/auth/me",
    {
      method: "POST",
    }
  );
}