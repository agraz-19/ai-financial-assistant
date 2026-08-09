import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";

import { useAuth } from "../context/useAuth";
import { BACKEND_BASE_URL } from "../services/config";

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fromPath = location.state?.from?.pathname || "/dashboard";
  const googleLoginUrl = `${BACKEND_BASE_URL}accounts/google/login/?next=${encodeURIComponent(
    `${BACKEND_BASE_URL}auth/google/complete/`
  )}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">
          Loading session
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username, password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Unable to sign in. Check your username and password.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.assign(googleLoginUrl);
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 32%), radial-gradient(circle at bottom right, rgba(15,23,42,0.92), rgba(2,6,23,1))",
      }}
    >
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl lg:p-12">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(14,165,233,0.2), transparent 55%)",
            }}
          />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">
                  Secure access
                </p>
                <h1 className="text-2xl font-semibold">AI Financial Assistant</h1>
              </div>
            </div>

            <div className="max-w-xl space-y-6">
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-200/70">
                JWT powered
              </p>
              <h2 className="text-5xl font-semibold leading-tight text-white lg:text-6xl">
                Sign in to your financial control center.
              </h2>
              <p className="max-w-lg text-base leading-7 text-slate-200/80">
                Use your Django username and password to unlock the dashboard,
                protected uploads, and the AI insights workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Encrypted", "Access tokens stay in the browser session."],
                ["Protected", "Every API request requires authentication."],
                ["Fast", "Refresh tokens keep you signed in smoothly."],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-200">
                    <ShieldCheck className="h-4 w-4" />
                    {title}
                  </div>
                  <p className="text-sm leading-6 text-slate-200/75">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-slate-200/10 bg-white p-8 text-slate-900 shadow-[0_30px_80px_rgba(2,6,23,0.35)] lg:p-10">
            <div className="mb-8 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Welcome back
              </p>
              <h3 className="text-3xl font-semibold text-slate-950">
                Log in with JWT
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Enter your credentials and we&apos;ll fetch a fresh access token
                plus your profile.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <FaGoogle className="h-4 w-4 text-slate-700" />
              </span>
              Continue with Google
            </button>

            <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or use username and password
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Username</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-100">
                  <User className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="your.username"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-100">
                  <LockKeyhole className="h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              If you are testing locally, use an existing Django user account
              with a real password. The API no longer falls back to a hidden
              default user.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
