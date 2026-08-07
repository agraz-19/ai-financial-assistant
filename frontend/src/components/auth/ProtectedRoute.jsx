import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "../../context/useAuth";

function AuthLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-slate-200 shadow-2xl backdrop-blur">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Checking session
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
