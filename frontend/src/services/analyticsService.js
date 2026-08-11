import api from "./api";

export async function getAnalytics({ month, scope = "month" } = {}) {
  try {
    const params = { scope };
    if (scope === "month" && month) params.month = month;
    const response = await api.get("analytics/", { params });
    return response.data;
  } catch (error) {
    console.error("[getAnalytics] Error:", error);
    throw error;
  }
}