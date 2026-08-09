import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function RecentTransactions({ data }) {
  const latestTransactions = (data || []).slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Latest 5</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Recent financial activity</p>
        </div>
        <Link to="/transactions" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          View All →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="pb-4">Merchant</th>
              <th className="pb-4">Category</th>
              <th className="pb-4">Date</th>
              <th className="pb-4 text-right">Amount</th>
              <th className="pb-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {latestTransactions.map((item, index) => {
              const categoryName = item.category_name ?? item.category ?? "Other";
              return (
                <tr key={item.id ?? index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${item.amount > 0 ? "bg-green-100 dark:bg-green-500/20" : "bg-red-100 dark:bg-red-500/20"}`}>
                        {item.amount > 0
                          ? <ArrowDownLeft className="text-green-600 dark:text-green-400" size={18} />
                          : <ArrowUpRight className="text-red-600 dark:text-red-400" size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{item.merchant ?? item.description}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{categoryName}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm">{categoryName}</span>
                  </td>
                  <td className="text-slate-600 dark:text-slate-400">{item.date}</td>
                  <td className={`text-right font-bold ${item.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {item.amount > 0 ? "+" : "-"}₹{Math.abs(Number(item.amount ?? 0)).toLocaleString("en-IN")}
                  </td>
                  <td className="text-center">
                    <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm">{item.status ?? "Completed"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}