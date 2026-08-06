import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UploadHero from "../components/statements/UploadHero";
import UploadDropzone from "../components/statements/UploadDropzone";
import StatementHistory from "../components/statements/StatementHistory";
import EmptyState from "../components/statements/EmptyState";
import {
  getStatements,
  uploadStatement,
  deleteStatement,
} from "../services/statementsService";

export default function Statements() {
  const navigate = useNavigate();
  const [statements, setStatements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDropzone, setShowUploadDropzone] = useState(false);
  const [error, setError] = useState(null);

  // Fetch statements on mount
  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      setIsLoading(true);
      const data = await getStatements();
      console.log("[Statements] Loaded statements:", data);
      setStatements(data);
      setError(null);
    } catch (err) {
      console.error("[Statements] Error loading statements:", err);
      setError("Failed to load statements");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection and upload
  const handleFileSelect = async (file) => {
    try {
      setIsUploading(true);
      setError(null);

      // Upload file to backend.
      // Backend processes synchronously and returns status COMPLETED or FAILED.
      const newStatement = await uploadStatement(file);

      // Add to statements list immediately (status reflects DB state)
      setStatements([newStatement, ...statements]);

      // Hide upload area immediately — no fake timers/animations.
      setIsUploading(false);
      setShowUploadDropzone(false);

      // Refresh statements list to ensure consistency with DB
      await loadStatements();
    } catch (err) {
      console.error("[handleFileSelect] Error:", err);
      setError(err.response?.data?.detail || err.message || "Failed to upload statement");
      setIsUploading(false);
    }
  };

  // Handle statement deletion
  const handleDeleteStatement = async (statementId) => {
    if (window.confirm("Are you sure you want to delete this statement and all its transactions?")) {
      try {
        console.log("[handleDeleteStatement] Deleting statement:", statementId);
        await deleteStatement(statementId);
        
        // Remove from list
        setStatements(statements.filter((s) => s.id !== statementId));
        
        // Refresh to ensure consistency
        await loadStatements();
      } catch (err) {
        console.error("[handleDeleteStatement] Error:", err);
        setError("Failed to delete statement");
      }
    }
  };

  // Handle statement view
  const handleViewStatement = (statementId) => {
    console.log("[handleViewStatement] Navigating to statement detail:", statementId);
    navigate(`/statements/${statementId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <UploadHero onUploadClick={() => setShowUploadDropzone(!showUploadDropzone)} />

      {showUploadDropzone && (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          <UploadDropzone
            onFileSelect={handleFileSelect}
            isUploading={isUploading}
          />
        </div>
      )}

      {error && (
        <div className="px-4 md:px-8 py-4 max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : statements.length > 0 ? (
          <StatementHistory
            statements={statements}
            onViewStatement={handleViewStatement}
            onDeleteStatement={handleDeleteStatement}
          />
        ) : (
          <EmptyState onUploadClick={() => setShowUploadDropzone(true)} />
        )}
      </div>
    </div>
  );
}
