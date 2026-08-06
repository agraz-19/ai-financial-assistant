import AIHero from "../components/dashboard/AIHero";
import AIInsightCard from "../components/dashboard/AIInsightCard";
import ExpensePieChart from "../components/dashboard/ExpensePieChart";
import MonthlyTrendChart from "../components/dashboard/MonthlyTrendChart";
import OverviewCards from "../components/dashboard/OverviewCards";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import useDashboard from "../hooks/useDashboard";

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

export default function Dashboard() {
  const { dashboard, loading, error } = useDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-10 text-red-500">
        Failed to load dashboard.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <AIHero data={dashboard} />

        <OverviewCards data={dashboard} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ExpensePieChart
            data={dashboard.spending_per_category}
          />

          <MonthlyTrendChart
            data={dashboard.monthly_trend}
          />
        </div>

        <AIInsightCard
          data={dashboard}
        />

        <RecentTransactions
          data={dashboard.recent_transactions}
        />
      </div>
    </>
  );
}
