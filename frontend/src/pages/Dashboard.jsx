import AIHero from "../components/dashboard/AIHero";
import AIInsightCard from "../components/dashboard/AIInsightCard";
import ExpensePieChart from "../components/dashboard/ExpensePieChart";
import MonthlyTrendChart from "../components/dashboard/MonthlyTrendChart";
import OverviewCards from "../components/dashboard/OverviewCards";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import useDashboard from "../hooks/useDashboard";

export default function Dashboard() {
  const { dashboard, loading, error } = useDashboard();

  if (loading) {
    return <div className="p-10">Loading Dashboard...</div>;
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
        <AIHero />

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
