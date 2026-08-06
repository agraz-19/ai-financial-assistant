import { Download, Trash2, Eye, Smartphone } from "lucide-react";
import { useState } from "react";
import { downloadStatement } from "../../services/statementsService";

export default function StatementCard({
  statement,
  onView,
  onDelete,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Determine provider from filename
  const getProvider = (filename) => {
    const upper = filename.toUpperCase();
    if (upper.includes("PHONEPE")) return "PhonePe";
    if (upper.includes("GOOGLEPAY")) return "Google Pay";
    if (upper.includes("PAYTM")) return "Paytm";
    return "Statement";
  };

  // Get provider color
  const getProviderColor = (filename) => {
    const upper = filename.toUpperCase();
    if (upper.includes("PHONEPE")) return "from-purple-500 to-purple-600";
    if (upper.includes("GOOGLEPAY")) return "from-blue-500 to-blue-600";
    if (upper.includes("PAYTM")) return "from-blue-600 to-indigo-600";
    return "from-slate-500 to-slate-600";
  };

  const provider = getProvider(statement.filename);
  const providerColor = getProviderColor(statement.filename);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadStatement(statement.id, statement.filename);
    } catch (err) {
      console.error("[StatementCard] Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this statement? This action cannot be undone."
      )
    ) {
      setIsDeleting(true);
      try {
        await onDelete?.();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Normalize status to uppercase (backend returns PROCESSING, COMPLETED, FAILED)
  const status = (statement.status || "UPLOADED").toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6">
      {/* Provider Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${providerColor} flex items-center justify-center text-white`}
          >
            <Smartphone size={24} />
          </div>

          <div>
            <p className="text-sm text-slate-500">{provider}</p>
            <h3 className="text-lg font-semibold text-slate-800">
              {statement.filename.replace(/\.[^/.]+$/, "")}
            </h3>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {status === "PROCESSING" && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />
              Processing
            </span>
          )}
          {status === "COMPLETED" && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-600" />
              Processed
            </span>
          )}
          {status === "FAILED" && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Failed
            </span>
          )}
          {status === "UPLOADED" && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Uploaded
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <p className="text-sm text-slate-500">Upload Date</p>
          <p className="text-base font-semibold text-slate-800">
            {formatDate(statement.uploaded_at || statement.created_at)}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Transactions</p>
          <p className="text-base font-semibold text-slate-800">
            {statement.transaction_count || 0}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onView?.()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
        >
          <Eye size={16} />
          View
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50"
        >
          <Download size={16} />
          {isDownloading ? "Downloading..." : "Download"}
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 size={16} />
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
