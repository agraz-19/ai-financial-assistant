import api from "./api";

export async function updateProfile(payload) {
  try {
    const response = await api.patch("me/", payload);
    return response.data;
  } catch (error) {
    console.error("[updateProfile] Error:", error);
    throw error;
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  try {
    const response = await api.post("me/password/", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    console.error("[changePassword] Error:", error);
    throw error;
  }
}

export async function exportTransactionsCSV() {
  try {
    const response = await api.get("me/export/", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[exportTransactionsCSV] Error:", error);
    throw error;
  }
}

export async function deleteAccount(password) {
  try {
    const response = await api.post("me/delete/", { password });
    return response.data;
  } catch (error) {
    console.error("[deleteAccount] Error:", error);
    throw error;
  }
}