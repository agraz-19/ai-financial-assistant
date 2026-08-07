import {
  LayoutDashboard,
  FileText,
  Wallet,
  ChartPie,
  Bot,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/useAuth";

const menuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Statements",
    path: "/statements",
    icon: FileText,
  },
  {
    title: "Transactions",
    path: "/transactions",
    icon: Wallet,
  },
  {
    title: "Analytics",
    path: "/analytics",
    icon: ChartPie,
  },
  {
    title: "AI Assistant",
    path: "/chat",
    icon: Bot,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const displayName = user?.username || "Authenticated user";
  const displayEmail = user?.email || "JWT session active";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">

      {/* Logo */}
      <div className="px-8 py-7 border-b border-slate-200">
        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            AI
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-800">
              AI Finance
            </h1>

            <p className="text-sm text-slate-500">
              Smart Financial Assistant
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">

        <div className="space-y-2">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                  
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                  }`
                }
              >
                <Icon size={20} />

                <span className="font-medium">
                  {item.title}
                </span>
              </NavLink>
            );
          })}

        </div>

      </nav>

      {/* Bottom User Section */}

      <div className="border-t border-slate-200 p-5">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
            {initials}
          </div>

          <div>

            <p className="font-semibold text-slate-800">
              {displayName}
            </p>

            <p className="text-sm text-slate-500">
              {displayEmail}
            </p>

          </div>

        </div>

      </div>

    </aside>
  );
}
