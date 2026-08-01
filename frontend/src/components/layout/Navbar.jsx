import { Bell, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8">

      {/* Search */}
      <div className="relative hidden lg:block">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search anything..."
          className="w-80 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4 ml-auto">

        <button
          onClick={() => navigate("/statements")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 transition"
        >
          <Plus size={18} />
          Upload Statement
        </button>

        <button className="relative w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
          <Bell size={20} />

          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        <button className="w-11 h-11 rounded-full bg-blue-600 text-white font-semibold hover:scale-105 transition">
          A
        </button>

      </div>
    </header>
  );
}
