import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function KPICard({
  title,
  value,
  icon,
  change,
  trend = "up",
  color = "blue",
  comparisonLabel,
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    red: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{value}</h2>
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          }`}
        >
          {trend === "up" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
          <span>{change}</span>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {comparisonLabel || "No prior period"}
        </span>
      </div>
    </div>
  );
}