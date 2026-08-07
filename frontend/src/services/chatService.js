import api from "./api";

export async function getChatMessages() {
  try {
    const response = await api.get("chat/messages/");
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  } catch (error) {
    console.error("[getChatMessages] Error:", error);
    throw error;
  }
}

export async function askQuestion(question) {
  try {
    const response = await api.post("chat/ask/", { question });
    return response.data;
  } catch (error) {
    console.error("[askQuestion] Error:", error);
    throw error;
  }
}