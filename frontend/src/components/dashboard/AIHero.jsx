import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import {
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  PiggyBank,
  Bot,
  ArrowRight,
  
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AIHero({ data }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.first_name || user?.username || "there";
  const [query, setQuery] = useState("");
  const savings = Number(data?.savings ?? 0);
  const insightsCount = data?.ai_recommendations?.length ?? 0;
  const hasData = Boolean(data?.month_label && data.month_label !== "No data yet");

  const goToChat = (prefill) => {
    navigate("/chat", prefill ? { state: { prefill } } : undefined);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    goToChat(query.trim() || undefined);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <Sparkles size={26} />
        </div>
        <div>
          <h1 className="text-4xl font-bold">Welcome back, {User.first_name} 👋</h1>
          <p className="text-blue-100 mt-2 text-lg">
            You saved ₹{savings.toLocaleString("en-IN")} this month.
          </p>
          <p className="text-blue-100 mt-1 text-sm">
            {insightsCount} new insight{insightsCount === 1 ? "" : "s"} available.
            {hasData ? "" : " Upload a statement to get started."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative mt-6">
        <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your money..."
          className="w-full rounded-2xl bg-white text-slate-700 py-4 pl-14 pr-14 text-lg outline-none shadow-lg"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition"
        >
          <ArrowRight size={20} />
        </button>
      </form>

      <div className="flex flex-wrap gap-3 mt-6">
        <button onClick={() => goToChat("What's my highest expense?")} className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <TrendingUp size={18} />
          Highest Expense
        </button>
        <button onClick={() => goToChat("What's my monthly spending?")} className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <Wallet size={18} />
          Monthly Spending
        </button>
        <button onClick={() => goToChat("Give me some savings tips.")} className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <PiggyBank size={18} />
          Savings Tips
        </button>
        <button onClick={() => goToChat()} className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-3 hover:bg-white/30 transition">
          <Bot size={18} />
          AI Insights
        </button>
      </div>
    </div>
  );
}