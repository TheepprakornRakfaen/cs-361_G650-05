const API_BASE_URL =
  "https://4gb0aky4q4.execute-api.us-east-1.amazonaws.com/v2";

async function request(path, token = null, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `API request failed: ${response.status}`);
  }

  return data;
}

export async function getTerms(token) {
  return request("/api/term", token);
}

export async function getPeriods(termId, token) {
  return request(`/api/period?term_id=${termId}`, token);
}
