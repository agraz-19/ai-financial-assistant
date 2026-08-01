import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function KPICard({
  title,
  value,
  icon,
  change,
  trend = "up",
  color = "blue",
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6">

      {/* Top Row */}
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h2 className="text-3xl font-bold text-slate-800 mt-2">
            {value}
          </h2>
        </div>

        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}
        >
          {icon}
        </div>

      </div>

      {/* Bottom Row */}

      <div className="flex items-center justify-between mt-6">

        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            trend === "up"
              ? "text-emerald-600"
              : "text-red-500"
          }`}
        >
          {trend === "up" ? (
            <ArrowUpRight size={18} />
          ) : (
            <ArrowDownRight size={18} />
          )}

          <span>{change}</span>
        </div>

        <span className="text-xs text-slate-400">
          vs last month
        </span>

      </div>

    </div>
  );
}