import api from "./api";

export async function getAnalytics(month) {
  try {
    const params = {};
    if (month) params.month = month;
    const response = await api.get("analytics/", { params });
    return response.data;
  } catch (error) {
    console.error("[getAnalytics] Error:", error);
    throw error;
  }
}
export async function getAnalytics({ month, scope = "month" } = {}) {
  const params = { scope };
  if (scope === "month" && month) params.month = month;
  const response = await api.get("analytics/", { params });
  return response.data;
}