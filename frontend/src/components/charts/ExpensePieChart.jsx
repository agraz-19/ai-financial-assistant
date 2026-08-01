import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Food", value: 18000 },
  { name: "Shopping", value: 12000 },
  { name: "Bills", value: 8000 },
  { name: "Travel", value: 6000 },
  { name: "Others", value: 4000 },
];

const COLORS = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

export default function ExpensePieChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-[420px]">

      <h2 className="text-xl font-semibold text-slate-800 mb-6">
        Spending by Category
      </h2>

      <ResponsiveContainer width="100%" height="85%">
        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
          >

            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
              />
            ))}

          </Pie>

          <Tooltip />

        </PieChart>
      </ResponsiveContainer>

    </div>
  );
}