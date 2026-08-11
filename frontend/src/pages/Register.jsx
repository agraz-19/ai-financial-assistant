import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import { useAuth } from "../context/useAuth";
import { registerAccount } from "../services/authService";
import { fetchCurrentUser } from "../services/authService";

export default function Register() {
  const { isAuthenticated, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await registerAccount({ username, email, password });
      await fetchCurrentUser().catch(() => null);
      if (refreshUser) await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const apiError = err.response?.data?.error;
      const message = Array.isArray(apiError) ? apiError.join(" ") : apiError || "Unable to create account.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
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
                  Get started
                </p>
                <h1 className="text-2xl font-semibold">AI Financial Assistant</h1>
              </div>
            </div>

            <div className="max-w-xl space-y-6">
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-200/70">
                Smart finance tracking
              </p>
              <h2 className="text-5xl font-semibold leading-tight text-white lg:text-6xl">
                Create your account and take control.
              </h2>
              <p className="max-w-lg text-base leading-7 text-slate-200/80">
                Track your spending, get AI-powered insights, and stay on top
                of your finances in one place.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Secure", "Your data stays private and encrypted."],
                ["Private", "Only you can see your financial data."],
                ["Seamless", "Stay signed in without interruption."],
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
                New here
              </p>
              <h3 className="text-3xl font-semibold text-slate-950">
                Create account
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Set a username and password to get started.
              </p>
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
                <span className="text-sm font-medium text-slate-700">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-100">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="you@example.com"
                    autoComplete="email"
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
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Confirm password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-100">
                  <LockKeyhole className="h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="confirm password"
                    autoComplete="new-password"
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
                {submitting ? "Creating account..." : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}