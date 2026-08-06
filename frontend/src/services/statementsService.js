import api from "./api";

/**
 * Fetch all statements for the authenticated user.
 * Expected response: array of statement objects
 */
export async function getStatements() {
  try {
    const response = await api.get("statements/");
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  } catch (error) {
    console.error("[getStatements] Error:", error);
    throw error;
  }
}

/**
 * Fetch a single statement by ID.
 */
export async function getStatement(statementId) {
  try {
    const response = await api.get(`statements/${statementId}/`);
    return response.data;
  } catch (error) {
    console.error("[getStatement] Error:", error);
    throw error;
  }
}

/**
 * Fetch transactions belonging to a specific statement.
 */
export async function getStatementTransactions(statementId) {
  try {
    const response = await api.get("transactions/", {
      params: { statement: statementId },
    });
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  } catch (error) {
    console.error("[getStatementTransactions] Error:", error);
    throw error;
  }
}

/**
 * Upload a statement file (CSV or PDF).
 * The backend processes synchronously and returns the statement
 * with status COMPLETED or FAILED.
 */
export async function uploadStatement(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_type", file.name.toLowerCase().endsWith(".csv") ? "CSV" : "PDF");

    const response = await api.post("statements/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  } catch (error) {
    console.error("[uploadStatement] Error:", error);
    throw error;
  }
}

/**
 * Delete a statement by ID.
 */
export async function deleteStatement(statementId) {
  try {
    await api.delete(`statements/${statementId}/`);
    return { success: true };
  } catch (error) {
    console.error("[deleteStatement] Error:", error);
    throw error;
  }
}

/**
 * Download the original uploaded statement file.
 */
export async function downloadStatement(statementId, filename) {
  try {
    const response = await api.get(`statements/${statementId}/download/`, {
      responseType: "blob",
    });

    // Create a temporary object URL and trigger the browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `statement-${statementId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("[downloadStatement] Error:", error);
    throw error;
  }
}