import { LayoutDashboard, FileText, Wallet, ChartPie, Bot, Settings, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Statements", path: "/statements", icon: FileText },
  { title: "Transactions", path: "/transactions", icon: Wallet },
  { title: "Analytics", path: "/analytics", icon: ChartPie },
  { title: "AI Assistant", path: "/chat", icon: Bot },
  { title: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const displayName = user?.username || "Authenticated user";
  const displayEmail = user?.email || "JWT session active";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <>
      {/* Mobile backdrop -- tapping it closes the sidebar */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm transition-transform duration-200
        lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-8 py-7 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">AI</div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">AI Finance</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Smart Financial Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">{initials}</div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">{displayName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{displayEmail}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}