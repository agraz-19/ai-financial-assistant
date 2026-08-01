import {
  IndianRupee,
  Wallet,
  PiggyBank,
  ShieldCheck,
} from "lucide-react";

import KPICard from "./KPICard";

export default function OverviewCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

      <KPICard
        title="Total Income"
        value="₹85,000"
        icon={<IndianRupee size={26} />}
        change="+12.4%"
        trend="up"
        color="green"
      />

      <KPICard
        title="Total Expenses"
        value="₹58,330"
        icon={<Wallet size={26} />}
        change="-4.8%"
        trend="down"
        color="red"
      />

      <KPICard
        title="Savings"
        value="₹26,670"
        icon={<PiggyBank size={26} />}
        change="+8.1%"
        trend="up"
        color="blue"
      />

      <KPICard
        title="AI Health Score"
        value="87 / 100"
        icon={<ShieldCheck size={26} />}
        change="+6 pts"
        trend="up"
        color="purple"
      />

    </div>
  );
}