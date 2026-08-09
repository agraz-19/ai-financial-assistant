import {
  IndianRupee,
  Wallet,
  PiggyBank,
  ShieldCheck,
} from "lucide-react";

import CountUp from "../common/CountUp";
import KPICard from "./KPICard";

function formatChange(value) {
  if (value === null || value === undefined) return "No prior data";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

export default function OverviewCards({ data }) {
  const healthScore = data?.health_score;
  const comparisonLabel = data?.comparison_label;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <KPICard
        title="Total Income"
        value={
          <CountUp
            value={data?.monthly_income ?? 0}
            prefix="₹"
            formatter={(value) => value.toLocaleString("en-IN")}
          />
        }
        icon={<IndianRupee size={26} />}
        change={formatChange(data?.income_change)}
        trend={(data?.income_change ?? 0) >= 0 ? "up" : "down"}
        color="green"
        comparisonLabel={comparisonLabel}
      />

      <KPICard
        title="Total Expenses"
        value={
          <CountUp
            value={data?.total_spending ?? 0}
            prefix="₹"
            formatter={(value) => value.toLocaleString("en-IN")}
          />
        }
        icon={<Wallet size={26} />}
        change={formatChange(data?.expense_change)}
        // for expenses, a decrease is the good direction
        trend={(data?.expense_change ?? 0) <= 0 ? "up" : "down"}
        color="red"
        comparisonLabel={comparisonLabel}
      />

      <KPICard
        title="Savings"
        value={
          <CountUp
            value={data?.savings ?? 0}
            prefix="₹"
            formatter={(value) => value.toLocaleString("en-IN")}
          />
        }
        icon={<PiggyBank size={26} />}
        change={formatChange(data?.savings_change)}
        trend={(data?.savings_change ?? 0) >= 0 ? "up" : "down"}
        color="blue"
        comparisonLabel={comparisonLabel}
      />

      <KPICard
        title="AI Health Score"
        value={`${healthScore ?? "--"} / 100`}
        icon={<ShieldCheck size={26} />}
        change={
          healthScore >= 70 ? "Healthy" :
          healthScore >= 40 ? "Fair" : "Needs attention"
        }
        trend={healthScore >= 50 ? "up" : "down"}
        color="purple"
        comparisonLabel="AI-generated score"
      />
    </div>
  );
}