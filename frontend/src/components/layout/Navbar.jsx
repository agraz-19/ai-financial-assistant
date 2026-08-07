import { LogOut, Plus, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/useAuth";
import { useTheme } from "../../context/ThemeContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const displayName = user?.username || user?.email || "Signed in user";
  const initials = (displayName || "U").slice(0, 1).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 ml-auto">
        <button
          onClick={() => navigate("/statements")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 transition"
        >
          <Plus size={18} />
          Upload Statement
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition text-slate-700 dark:text-slate-200"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="w-11 h-11 rounded-full bg-blue-600 text-white font-semibold hover:scale-105 transition">
          {initials}
        </button>

        <div className="hidden xl:block">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">JWT authenticated</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}