import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Flame, TrendingUp, TrendingDown, Sparkles, Wallet, Target } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

import useAnalytics from "../hooks/useAnalytics";
import { useTheme } from "../context/ThemeContext";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function monthLabel(monthStr) {
  if (!monthStr) return "No data";
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{value}</p>
    </div>
  );
}

function MonthSelector({ availableMonths, month, onChange }) {
  const index = availableMonths.indexOf(month);
  const canGoPrev = index >= 0 && index < availableMonths.length - 1;
  const canGoNext = index > 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2">
      <button
        disabled={!canGoPrev}
        onClick={() => onChange(availableMonths[index + 1])}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={18} />
      </button>

      <select
        value={month || ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableMonths.map((m) => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>

      <button
        disabled={!canGoNext}
        onClick={() => onChange(availableMonths[index - 1])}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function CategoryBreakdown({ data, isDark }) {
  const chartData = data.map((item) => ({ name: item.category, value: item.amount }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">Category Breakdown</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Where your money went this month</p>

      {chartData.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm py-10 text-center">No spending data for this month.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} dataKey="value" nameKey="name">
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#0f172a" : "#fff",
                  border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                  borderRadius: 12,
                  color: isDark ? "#e2e8f0" : "#1e293b",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-700 dark:text-slate-300">{item.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800 dark:text-white">₹{item.amount.toLocaleString("en-IN")}</span>
                  <span className="text-slate-400 dark:text-slate-500 w-12 text-right">{item.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryTrends({ data }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">Category Trends</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This month vs previous month</p>

      {data.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">Not enough data to compare.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((item) => {
            const isUp = (item.change_percent ?? 0) > 0;
            return (
              <div key={item.category} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                <p className="font-semibold text-slate-800 dark:text-white">{item.category}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">₹{item.current.toLocaleString("en-IN")}</span>
                  {item.change_percent !== null ? (
                    <span className={`flex items-center gap-1 font-medium ${isUp ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {Math.abs(item.change_percent)}%
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">New</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DailySpending({ data, isDark }) {
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 h-[360px]">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">Daily Spending</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Spot unusually expensive days</p>

      {data.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm py-10 text-center">No spending data for this month.</p>
      ) : (
        <ResponsiveContainer width="100%" height="75%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="day" stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }} />
            <YAxis stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#0f172a" : "#fff",
                border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                borderRadius: 12,
                color: isDark ? "#e2e8f0" : "#1e293b",
              }}
            />
            <Bar dataKey="amount" fill="#2563EB" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function BiggestExpenses({ data }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Flame size={18} className="text-orange-500" />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Biggest Expenses</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Top spends this month</p>

      {data.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">No expenses recorded.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">{item.description}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{item.category} · {item.date}</p>
                </div>
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">₹{item.amount.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIInsight({ summary, advice, recommendations }) {
  const hasContent = Boolean(summary || advice || (recommendations && recommendations.length));

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-3xl shadow-lg p-8 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
          <Sparkles size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Monthly Insight</h2>
          <p className="text-blue-100 text-sm mt-0.5">Generated from this month's spending</p>
        </div>
      </div>

      {hasContent ? (
        <div className="space-y-4">
          {summary && <p className="text-blue-50 leading-7">{summary}</p>}
          {advice && (
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-blue-50 leading-6">{advice}</p>
            </div>
          )}
          {recommendations?.length > 0 && (
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-50">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-blue-100 text-sm">Not enough data yet to generate an insight for this month.</p>
      )}
    </div>
  );
}

function BudgetAndPrediction({ forecast, currentMonthLabel }) {
  const categories = forecast?.categories ?? [];
  const predictedTotal = forecast?.predicted_total ?? 0;
  const currentMonthTotal = forecast?.current_month_total ?? 0;
  const changePercent = currentMonthTotal
    ? Math.round(((predictedTotal - currentMonthTotal) / currentMonthTotal) * 1000) / 10
    : null;

  if (categories.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">Budget & Prediction</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">
          Not enough history yet -- upload a couple more statements to unlock this.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} className="text-emerald-500" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Recommended Budget</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Based on your average spend per category over the last few months
        </p>

        <div className="space-y-3">
          {categories.map((item) => (
            <div key={item.category} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">{item.category}</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                ₹{item.recommended.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-700 dark:text-slate-300">Recommended Total</span>
          <span className="text-slate-900 dark:text-white">₹{predictedTotal.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Target size={18} className="text-blue-500" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Next Month Prediction</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Simple trailing-average estimate, not a forecast model
        </p>

        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Expected next month</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
            ₹{predictedTotal.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{currentMonthLabel || "Current month"}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">₹{currentMonthTotal.toLocaleString("en-IN")}</span>
        </div>

        {changePercent !== null && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-500 dark:text-slate-400">Projected change</span>
            <span className={`flex items-center gap-1 font-medium ${changePercent > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {changePercent > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {changePercent > 0 ? "+" : ""}{changePercent}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get("month") || undefined;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { analytics, loading, error } = useAnalytics(monthParam);
  const [pendingMonth, setPendingMonth] = useState(monthParam);

  useEffect(() => {
    if (analytics?.month && !monthParam) {
      const params = new URLSearchParams(searchParams);
      params.set("month", analytics.month);
      setSearchParams(params, { replace: true });
    }
  }, [analytics, monthParam, searchParams, setSearchParams]);

  const handleMonthChange = (nextMonth) => {
    setPendingMonth(nextMonth);
    const params = new URLSearchParams(searchParams);
    params.set("month", nextMonth);
    setSearchParams(params);
  };

  if (loading && !analytics) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500 dark:text-slate-400">
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-red-500 dark:text-red-400">Failed to load analytics.</div>;
  }

  if (!analytics?.available_months?.length) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
        <p className="text-slate-500 dark:text-slate-400">Upload a statement to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <MonthSelector
          availableMonths={analytics.available_months}
          month={pendingMonth || analytics.month}
          onChange={handleMonthChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard label="Total Spending" value={`₹${analytics.total_spending.toLocaleString("en-IN")}`} />
        <SummaryCard label="Monthly Average" value={`₹${analytics.monthly_average.toLocaleString("en-IN")}`} />
        <SummaryCard label="Top Category" value={analytics.top_category} />
        <SummaryCard label="Transactions" value={analytics.transaction_count} />
      </div>

      <CategoryBreakdown data={analytics.spending_per_category} isDark={isDark} />
      <CategoryTrends data={analytics.category_trends} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DailySpending data={analytics.daily_spending} isDark={isDark} />
        <BiggestExpenses data={analytics.biggest_expenses} />
      </div>

      <AIInsight
        summary={analytics.ai_spending_summary}
        advice={analytics.ai_budget_advice}
        recommendations={analytics.ai_recommendations}
      />

      <BudgetAndPrediction
        forecast={analytics.category_forecast}
        currentMonthLabel={monthLabel(analytics.month)}
      />
    </div>
  );
}