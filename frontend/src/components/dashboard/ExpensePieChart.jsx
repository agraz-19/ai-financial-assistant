import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTheme } from "../../context/ThemeContext";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

export default function ExpensePieChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const chartData = (data || []).map((item) => ({
    name: item.name ?? item.category ?? "Unknown",
    value: Number(item.value ?? item.amount ?? 0),
  }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 h-[420px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Spending by Category</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Distribution of your expenses</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="82%">
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={3} dataKey="value" nameKey="name" animationDuration={900}>
            {chartData.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
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
          <Legend verticalAlign="bottom" wrapperStyle={{ color: isDark ? "#cbd5e1" : "#334155" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}