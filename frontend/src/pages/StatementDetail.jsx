import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Smartphone } from "lucide-react";
import {
  getStatement,
  getStatementTransactions,
  downloadStatement,
} from "../services/statementsService";

export default function StatementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [statement, setStatement] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStatement = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stmtData, txnData] = await Promise.all([
        getStatement(id),
        getStatementTransactions(id),
      ]);
      setStatement(stmtData);
      setTransactions(txnData);
      setError(null);
    } catch (err) {
      console.error("[StatementDetail] Error loading:", err);
      setError("Failed to load statement details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStatement();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadStatement]);

  const handleDownload = async () => {
    try {
      await downloadStatement(id, statement?.filename);
    } catch (err) {
      console.error("[StatementDetail] Download error:", err);
      setError("Failed to download file");
    }
  };

  const getProvider = (filename) => {
    const upper = (filename || "").toUpperCase();
    if (upper.includes("PHONEPE")) return "PhonePe";
    if (upper.includes("GOOGLEPAY")) return "Google Pay";
    if (upper.includes("PAYTM")) return "Paytm";
    return "Statement";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount) => {
    const num = Number(amount);
    const formatted = Math.abs(num).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `-₹${formatted}` : `₹${formatted}`;
  };

  const status = (statement?.status || "UPLOADED").toUpperCase();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-red-500 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/statements")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft size={18} />
            Back to Statements
          </button>

          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            Statement Details
          </h1>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      {/* Statement Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
            <Smartphone size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{getProvider(statement?.filename)}</p>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
              {statement?.filename?.replace(/\.[^/.]+$/, "") || "Statement"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
            <p className="text-base font-semibold text-slate-800 dark:text-white">
              {status === "COMPLETED" && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                  Completed
                </span>
              )}
              {status === "FAILED" && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                  Failed
                </span>
              )}
              {status === "PROCESSING" && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-yellow-600 dark:bg-yellow-400 animate-pulse" />
                  Processing
                </span>
              )}
              {status === "UPLOADED" && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                  Uploaded
                </span>
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload Date</p>
            <p className="text-base font-semibold text-slate-800 dark:text-white">
              {formatDate(statement?.uploaded_at)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Processed At</p>
            <p className="text-base font-semibold text-slate-800 dark:text-white">
              {formatDate(statement?.processed_at)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Transactions</p>
            <p className="text-base font-semibold text-slate-800 dark:text-white">
              {statement?.transaction_count || 0}
            </p>
          </div>
        </div>

        {statement?.error_message && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {statement.error_message}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
          Transactions ({transactions.length})
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <p className="text-slate-500 dark:text-slate-400">No transactions found for this statement</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Description</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Category</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {formatDate(txn.date)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {txn.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                        {txn.category_name || "Uncategorized"}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${Number(txn.amount) < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {formatAmount(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}