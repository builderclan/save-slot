"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "Campus Admin",
    email: "admin@campus.edu",
    password: "admin123",
    badge: "Full Admin",
    color: "from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/30",
  },
  {
    role: "Coding Club Lead",
    email: "lead.coding@campus.edu",
    password: "lead123",
    badge: "Tech Lead",
    color: "from-blue-500/20 to-cyan-500/10 text-blue-300 border-blue-500/30",
  },
  {
    role: "Design Society Lead",
    email: "lead.design@campus.edu",
    password: "lead123",
    badge: "Arts Lead",
    color: "from-purple-500/20 to-pink-500/10 text-purple-300 border-purple-500/30",
  },
  {
    role: "E-Cell Lead",
    email: "lead.ecell@campus.edu",
    password: "lead123",
    badge: "Career Lead",
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/30",
  },
];

function LoginParamsHandler({ onSetError }: { onSetError: (msg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("error") === "admin_required") {
      onSetError("Administrative privileges required to access the Admin Console. Please sign in with an Administrator account.");
    }
  }, [searchParams, onSetError]);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<{
    fullName: string;
    role: string;
    isAdmin: boolean;
    isLead: boolean;
  } | null>(null);

  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentSession(data.user);
        }
      } catch {
        // Ignored
      }
    }
    checkExistingAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push(data.redirectUrl || "/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 text-slate-800">
      {/* Back to Calendar */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>← Back to Public Calendar</span>
        </Link>
        <span className="text-[11px] text-slate-500 px-2.5 py-0.5 rounded-full border border-slate-200 bg-white shadow-2xs font-medium">
          Apex Institute
        </span>
      </div>

      <Suspense fallback={null}>
        <LoginParamsHandler onSetError={setError} />
      </Suspense>

      <div className="w-full max-w-md relative z-10">
        <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Campus Staff Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in as Campus Administrator or Community Lead
            </p>
          </div>

          {currentSession && (
            <div className="mb-6 p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/70 text-indigo-950 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Signed in as <strong className="font-semibold">{currentSession.fullName}</strong> ({currentSession.role === "admin" ? "Admin" : "Lead"})
                </span>
              </div>
              <Link
                href={currentSession.isAdmin ? "/admin" : "/lead"}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors shrink-0"
              >
                Go to Workspace →
              </Link>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Campus Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
              <span>One-Click Demo Personas:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemoAccount(acc.email, acc.password)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-xs cursor-pointer shadow-xs"
                >
                  <div className="font-semibold text-slate-900">{acc.role}</div>
                  <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Notice: Public student registration is disabled. Accounts are provisioned exclusively by Campus Administration.
        </p>
      </div>
    </div>
  );
}
