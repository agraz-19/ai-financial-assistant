import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, FileText } from "lucide-react";

import AIHero from "../components/dashboard/AIHero";
import AIInsightCard from "../components/dashboard/AIInsightCard";
import ExpensePieChart from "../components/dashboard/ExpensePieChart";
import MonthlyTrendChart from "../components/dashboard/MonthlyTrendChart";
import OverviewCards from "../components/dashboard/OverviewCards";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import useDashboard from "../hooks/useDashboard";
import { getStatements } from "../services/statementsService";

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-3xl bg-slate-200 h-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="rounded-3xl bg-slate-200 h-40" />
        <div className="rounded-3xl bg-slate-200 h-40" />
        <div className="rounded-3xl bg-slate-200 h-40" />
        <div className="rounded-3xl bg-slate-200 h-40" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-slate-200 h-[420px]" />
        <div className="rounded-3xl bg-slate-200 h-[420px]" />
      </div>
      <div className="rounded-3xl bg-slate-200 h-[320px]" />
      <div className="rounded-3xl bg-slate-200 h-[520px]" />
    </div>
  );
}

function ScopeSelector({ scope, statementId, statements, onScopeChange, onStatementChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-slate-200 p-2">
      <button
        onClick={() => onScopeChange("all")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
          scope === "all" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <LayoutGrid size={16} />
        All Time
      </button>

      <button
        onClick={() => onScopeChange("statement")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
          scope === "statement" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <FileText size={16} />
        This Statement
      </button>

      {scope === "statement" && (
        <select
          value={statementId || ""}
          onChange={(event) => onStatementChange(event.target.value)}
          className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statements.map((statement) => (
            <option key={statement.id} value={statement.id}>
              {statement.filename || `Statement #${statement.id}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = searchParams.get("scope") === "statement" ? "statement" : "all";
  const statementId = searchParams.get("statement") || undefined;

  const [statements, setStatements] = useState([]);

  useEffect(() => {
    getStatements().then(setStatements).catch(() => setStatements([]));
  }, []);

  const { dashboard, loading, error } = useDashboard({ scope, statementId });

  // Once statements load, default "This Statement" to the latest upload.
  useEffect(() => {
    if (scope === "statement" && !statementId && statements.length > 0) {
      const params = new URLSearchParams(searchParams);
      params.set("statement", String(statements[0].id));
      setSearchParams(params, { replace: true });
    }
  }, [scope, statementId, statements, searchParams, setSearchParams]);

  const handleScopeChange = (nextScope) => {
    const params = new URLSearchParams(searchParams);
    params.set("scope", nextScope);
    if (nextScope === "statement" && statements.length > 0 && !statementId) {
      params.set("statement", String(statements[0].id));
    }
    if (nextScope === "all") {
      params.delete("statement");
    }
    setSearchParams(params);
  };

  const handleStatementChange = (nextId) => {
    const params = new URLSearchParams(searchParams);
    params.set("scope", "statement");
    params.set("statement", nextId);
    setSearchParams(params);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="p-10 text-red-500">Failed to load dashboard.</div>;
  }

  return (
    <div className="space-y-8">
      <ScopeSelector
        scope={scope}
        statementId={statementId}
        statements={statements}
        onScopeChange={handleScopeChange}
        onStatementChange={handleStatementChange}
      />

      <AIHero data={dashboard} />
      <OverviewCards data={dashboard} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ExpensePieChart data={dashboard.spending_per_category} />
        <MonthlyTrendChart data={dashboard.monthly_trend} />
      </div>

      <AIInsightCard data={dashboard} />
      <RecentTransactions data={dashboard.recent_transactions} />
    </div>
  );
}