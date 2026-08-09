import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useTheme } from "../../context/ThemeContext";

export default function MonthlyTrendChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  const chartData = (data || []).map((item) => {
    const income = Number(item.income ?? item.total_income ?? item.amount ?? 0);
    const expense = Number(item.expense ?? item.spending ?? 0);
    const savings = Number(item.savings ?? Math.max(0, income - expense));
    return { month: item.month ?? item.month_label ?? "Unknown", income, expense, savings };
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 h-[420px]">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Monthly Spending Trend</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Income vs Expense vs Savings</p>
      </div>

      <ResponsiveContainer width="100%" height="82%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" stroke={axisColor} tick={{ fill: axisColor }} />
          <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#0f172a" : "#fff",
              border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
              borderRadius: 12,
              color: isDark ? "#e2e8f0" : "#1e293b",
            }}
          />
          <Line type="monotone" dataKey="income" stroke="#2563EB" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} animationDuration={1200} />
          <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} animationDuration={1400} />
          <Line type="monotone" dataKey="savings" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} animationDuration={1600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}