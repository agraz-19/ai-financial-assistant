import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadHero from "../components/statements/UploadHero";
import UploadDropzone from "../components/statements/UploadDropzone";
import StatementHistory from "../components/statements/StatementHistory";
import EmptyState from "../components/statements/EmptyState";
import { getStatements, uploadStatement, deleteStatement } from "../services/statementsService";

export default function Statements() {
  const navigate = useNavigate();
  const [statements, setStatements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDropzone, setShowUploadDropzone] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const loadStatements = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getStatements();
      setStatements(data);
      setError(null);
    } catch (err) {
      console.error("[Statements] Error loading statements:", err);
      setError("Failed to load statements");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => { void loadStatements(); }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadStatements]);

  const handleFileSelect = async (file) => {
    try {
      setIsUploading(true);
      setError(null);
      setWarnings([]);
      const newStatement = await uploadStatement(file);
      setStatements([newStatement, ...statements]);
      setWarnings(
        Array.isArray(newStatement.warnings)
          ? newStatement.warnings.filter(
              (w) =>
                !w.toLowerCase().includes("skipped") &&
                !w.toLowerCase().includes("embedding failed")
            )
          : []
      );
      setIsUploading(false);
      setShowUploadDropzone(false);
      await loadStatements();
    } catch (err) {
      console.error("[handleFileSelect] Error:", err);
      setError(err.response?.data?.detail || err.message || "Failed to upload statement");
      setWarnings([]);
      setIsUploading(false);
    }
  };

  const handleDeleteStatement = async (statementId) => {
    if (window.confirm("Are you sure you want to delete this statement and all its transactions?")) {
      try {
        await deleteStatement(statementId);
        setStatements(statements.filter((s) => s.id !== statementId));
        await loadStatements();
      } catch (err) {
        console.error("[handleDeleteStatement] Error:", err);
        setError("Failed to delete statement");
      }
    }
  };

  const handleViewStatement = (statementId) => navigate(`/statements/${statementId}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <UploadHero onUploadClick={() => setShowUploadDropzone(!showUploadDropzone)} />

      {showUploadDropzone && (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          <UploadDropzone onFileSelect={handleFileSelect} isUploading={isUploading} />
        </div>
      )}

      {error && (
        <div className="px-4 md:px-8 py-4 max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="px-4 md:px-8 py-4 max-w-6xl mx-auto">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-2">Upload completed with warnings</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : statements.length > 0 ? (
          <StatementHistory statements={statements} loading={isLoading} error={error} onViewStatement={handleViewStatement} onDeleteStatement={handleDeleteStatement} />
        ) : (
          <EmptyState onUploadClick={() => setShowUploadDropzone(true)} />
        )}
      </div>
    </div>
  );
}