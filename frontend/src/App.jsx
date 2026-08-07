import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Statements from "./pages/Statements";
import StatementDetail from "./pages/StatementDetail";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import { useAuth } from "./context/useAuth";

function RootRedirect() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">
          Loading session
        </div>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function NotFound() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">
          Loading session
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-3xl font-bold text-slate-700">
      404 | Page Not Found
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/statements" element={<Statements />} />
          <Route path="/statements/:id" element={<StatementDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
