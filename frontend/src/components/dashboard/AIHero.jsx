import {
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  PiggyBank,
  Bot,
} from "lucide-react";

export default function AIHero() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl">

      <div className="flex items-center gap-3 mb-4">

        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">

          <Sparkles size={26} />

        </div>

        <div>

          <h1 className="text-4xl font-bold">
            Good Evening, Agraz 👋
          </h1>

          <p className="text-blue-100 mt-2 text-lg">
            Upload statements, analyze spending, and ask AI anything about your money.
          </p>

        </div>

      </div>

      {/* Search */}

      <div className="relative mt-6">

        <Search
          size={22}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          placeholder="Ask anything about your money..."
          className="w-full rounded-2xl bg-white text-slate-700 py-4 pl-14 pr-5 text-lg outline-none shadow-lg"
        />

      </div>

      {/* Suggestions */}

      <div className="flex flex-wrap gap-3 mt-6">

        <button className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <TrendingUp size={18} />
          Highest Expense
        </button>

        <button className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <Wallet size={18} />
          Monthly Spending
        </button>

        <button className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <PiggyBank size={18} />
          Savings Tips
        </button>

        <button className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <Bot size={18} />
          AI Insights
        </button>

      </div>

    </div>
  );
}
