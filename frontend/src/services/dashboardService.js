import api from "./api";

export async function getDashboard() {
  try {
    const response = await api.get("dashboard/");
    return response.data;
  } catch (error) {
    console.error("Dashboard API Error:", error);
    throw error;
  }
}