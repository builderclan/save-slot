"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Lock, Mail, ArrowRight, Shield, Sparkles, AlertCircle } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#090a0f] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Back to Notice Board */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>← Back to Student Notice Board</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-500 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">
          Apex Institute
        </span>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="p-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-2xl shadow-indigo-950/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Campus Portal</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in as Campus Administrator or Community Lead
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Campus Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>One-Click Demo Personas:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemoAccount(acc.email, acc.password)}
                  className={`text-left p-2.5 rounded-xl border bg-gradient-to-br ${acc.color} hover:brightness-125 transition-all text-xs cursor-pointer`}
                >
                  <div className="font-semibold">{acc.role}</div>
                  <div className="text-[10px] opacity-75 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-500 mt-4">
          Notice: Public student registration is disabled. Accounts are provisioned exclusively by Campus Administration.
        </p>
      </div>
    </div>
  );
}
