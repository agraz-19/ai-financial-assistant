import {
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

export default function RecentTransactions({ data }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Recent Transactions
          </h2>

          <p className="text-slate-500 text-sm mt-1">
            Your latest financial activity
          </p>
        </div>

        <button className="text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-500 border-b">
              <th className="pb-4">Merchant</th>
              <th className="pb-4">Category</th>
              <th className="pb-4">Date</th>
              <th className="pb-4 text-right">Amount</th>
              <th className="pb-4 text-center">Status</th>
            </tr>
          </thead>

          <tbody>
            {(data || []).map((item, index) => (
              <tr
                key={item.id ?? index}
                className="border-b border-slate-100 hover:bg-slate-50 transition"
              >
                <td className="py-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center ${
                        item.amount > 0
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      {item.amount > 0 ? (
                        <ArrowDownLeft
                          className="text-green-600"
                          size={18}
                        />
                      ) : (
                        <ArrowUpRight
                          className="text-red-600"
                          size={18}
                        />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.merchant ?? item.description}
                      </p>

                      <p className="text-sm text-slate-500">
                        {item.category}
                      </p>
                    </div>
                  </div>
                </td>

                <td>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-sm">
                    {item.category}
                  </span>
                </td>

                <td className="text-slate-600">
                  {item.date}
                </td>

                <td
                  className={`text-right font-bold ${
                    item.amount > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {item.amount > 0 ? "+" : "-"}Rs.
                  {Math.abs(Number(item.amount ?? 0)).toLocaleString()}
                </td>

                <td className="text-center">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                    {item.status ?? "Completed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
