import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#2563EB",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
];

export default function ExpensePieChart({ data }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-[420px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Spending by Category
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Distribution of your expenses
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="82%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={60}
            paddingAngle={3}
            dataKey="value"
            animationDuration={900}
          >
            {(data || []).map((entry, index) => (
              <Cell
                key={entry.category ?? entry.name}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip />

          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
