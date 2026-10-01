const API_BASE_URL =
  "https://4gb0aky4q4.execute-api.us-east-1.amazonaws.com/v2";

export async function getCourses(termId, token) {
  const params = new URLSearchParams();

  if (termId !== undefined && termId !== null) {
    params.set("term_id", termId);
  }

  const query = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/api/courses${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `API request failed: ${response.status}`);
  }

  return data;
}
