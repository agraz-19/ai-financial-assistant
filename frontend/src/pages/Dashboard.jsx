import AIHero from "../components/dashboard/AIHero";
import OverviewCards from "../components/dashboard/OverviewCards";

export default function Dashboard() {
  return (
    <div className="space-y-8">

      {/* AI Hero Section */}

      <AIHero />

      {/* KPI Cards */}

      <OverviewCards />

      {/* Charts */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Spending by Category */}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-[420px]">

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-xl font-semibold text-slate-800">
              Spending by Category
            </h2>

            <button className="text-sm text-blue-600 hover:underline">
              View Details
            </button>

          </div>

          <div className="flex items-center justify-center h-full text-slate-400">

            Pie Chart Coming Soon

          </div>

        </div>

        {/* Monthly Trend */}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-[420px]">

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-xl font-semibold text-slate-800">
              Monthly Spending Trend
            </h2>

            <button className="text-sm text-blue-600 hover:underline">
              View Details
            </button>

          </div>

          <div className="flex items-center justify-center h-full text-slate-400">

            Line Chart Coming Soon

          </div>

        </div>

      </div>

      {/* AI Insight */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">

        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-semibold text-slate-800">
            AI Financial Insight
          </h2>

          <span className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium">
            AI Generated
          </span>

        </div>

        <div className="mt-6">

          <p className="text-slate-600 leading-8">

            Based on your recent transactions, your spending appears
            healthy and your savings trend is improving.

          </p>

          <p className="text-slate-600 leading-8 mt-4">

            Soon this section will display personalized financial
            recommendations generated directly from your Django +
            OpenAI backend.

          </p>

        </div>

      </div>

      {/* Recent Transactions */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">

        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-semibold text-slate-800">
            Recent Transactions
          </h2>

          <button className="text-blue-600 hover:underline">
            View All
          </button>

        </div>

        <div className="mt-8 flex items-center justify-center h-48 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">

          Transaction Table Coming Soon

        </div>

      </div>

    </div>
  );
}