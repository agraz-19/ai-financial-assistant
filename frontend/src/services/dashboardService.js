import api from "./api";

export async function getDashboard({ scope = "all", statementId } = {}) {
  try {
    const params = { scope };
    if (scope === "statement" && statementId) {
      params.statement = statementId;
    }
    const response = await api.get("dashboard/", { params });
    return response.data;
  } catch (error) {
    console.error("Dashboard API Error:", error);
    throw error;
  }
}