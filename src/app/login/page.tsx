"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LogOut,
  Shield,
  Code2,
  Palette,
  Briefcase,
  ChevronRight,
  Check,
  GraduationCap,
} from "lucide-react";

interface DemoAccount {
  id: string;
  role: string;
  department: string;
  email: string;
  password: string;
  shortTag: string;
  icon: typeof Shield;
  iconBg: string;
  iconColor: string;
  tagStyle: string;
  activeClass: string;
}

const SHOW_DEMO_PERSONAS =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGINS === "true" ||
  process.env.NODE_ENV !== "production";

const DEMO_PERSONAS: DemoAccount[] = SHOW_DEMO_PERSONAS
  ? [
      {
        id: "principal",
        role: "College Principal",
        department: "Executive Office of the Principal",
        email: "principal@campus.edu",
        password: "principal123",
        shortTag: "Principal",
        icon: GraduationCap,
        iconBg: "bg-purple-100 text-purple-700 border-purple-200",
        iconColor: "text-purple-700",
        tagStyle: "bg-purple-50 text-purple-800 border-purple-200",
        activeClass: "border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20",
      },
      {
        id: "vice_principal",
        role: "Vice Principal",
        department: "Office of the Vice Principal",
        email: "viceprincipal@campus.edu",
        password: "viceprincipal123",
        shortTag: "Vice Principal",
        icon: GraduationCap,
        iconBg: "bg-indigo-100 text-indigo-700 border-indigo-200",
        iconColor: "text-indigo-700",
        tagStyle: "bg-indigo-50 text-indigo-800 border-indigo-200",
        activeClass: "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20",
      },
      {
        id: "admin",
        role: "Campus Admin",
        department: "Office of Student Affairs",
        email: "admin@campus.edu",
        password: "admin123",
        shortTag: "Admin",
        icon: Shield,
        iconBg: "bg-amber-100 text-amber-700 border-amber-200",
        iconColor: "text-amber-700",
        tagStyle: "bg-amber-50 text-amber-800 border-amber-200",
        activeClass: "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20",
      },
      {
        id: "coding",
        role: "Coding Club Lead",
        department: "Dept. of Computer Science",
        email: "lead.coding@campus.edu",
        password: "lead123",
        shortTag: "Tech",
        icon: Code2,
        iconBg: "bg-indigo-100 text-indigo-700 border-indigo-200",
        iconColor: "text-indigo-700",
        tagStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
        activeClass: "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20",
      },
      {
        id: "design",
        role: "Design Society Lead",
        department: "Media & Arts Collective",
        email: "lead.design@campus.edu",
        password: "lead123",
        shortTag: "Arts",
        icon: Palette,
        iconBg: "bg-purple-100 text-purple-700 border-purple-200",
        iconColor: "text-purple-700",
        tagStyle: "bg-purple-50 text-purple-700 border-purple-200",
        activeClass: "border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20",
      },
      {
        id: "ecell",
        role: "E-Cell Lead",
        department: "Innovation & Incubation Cell",
        email: "lead.ecell@campus.edu",
        password: "lead123",
        shortTag: "Career",
        icon: Briefcase,
        iconBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        iconColor: "text-emerald-700",
        tagStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
        activeClass: "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20",
      },
    ]
  : [];

function LoginParamsHandler({
  onSetError,
  onSetRedirect,
}: {
  onSetError: (msg: string) => void;
  onSetRedirect: (url: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("error") === "admin_required") {
      onSetError(
        "Administrative privileges required to access the Admin Console. Please sign in with an Administrator account."
      );
    }
    const redirectParam = searchParams.get("redirect") || searchParams.get("returnTo");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      onSetRedirect(redirectParam);
    }
  }, [searchParams, onSetError, onSetRedirect]);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [customRedirect, setCustomRedirect] = useState<string | null>(null);
  const [loggingOutExisting, setLoggingOutExisting] = useState(false);

  const [currentSession, setCurrentSession] = useState<{
    fullName: string;
    role: string;
    isAdmin: boolean;
    isPrincipal: boolean;
    isVicePrincipal?: boolean;
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

  const handleSignOutExisting = async () => {
    try {
      setLoggingOutExisting(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentSession(null);
      router.refresh();
    } catch {
      // Ignored
    } finally {
      setLoggingOutExisting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      const destination = customRedirect || data.redirectUrl || "/";
      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = useCallback((persona: DemoAccount) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setActivePersonaId(persona.id);
    setError(null);
  }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between bg-gradient-to-b from-indigo-50/30 via-slate-50/50 to-slate-50 py-8 px-4 sm:px-6">
      <Suspense fallback={null}>
        <LoginParamsHandler onSetError={setError} onSetRedirect={setCustomRedirect} />
      </Suspense>

      {/* Top navigation row with subtle institutional accent */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Public Calendar</span>
        </Link>
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
          AISAT Kochi
        </span>
      </div>

      {/* Central Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-indigo-950/5">
          <div className="p-6 sm:p-8">
            {/* Institution Brand Header */}
            <div className="mb-6 flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0 ring-1 ring-slate-900/5">
                <Image
                  src="/icon.png"
                  alt="SaveSlot"
                  width={48}
                  height={48}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Save<span className="text-[#8B5CF6]">Slot</span> Portal
                  </h1>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  Albertian Institute of Science & Technology
                </p>
              </div>
            </div>

            {/* Existing Active Session Banner */}
            {currentSession && (
              <div className="mb-6 p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
                  <div className="truncate">
                    <span className="text-slate-700">Signed in: </span>
                    <strong className="font-semibold text-indigo-950">{currentSession.fullName}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSignOutExisting}
                    disabled={loggingOutExisting}
                    className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-medium transition-colors"
                  >
                    <LogOut className="w-3 h-3 inline mr-1" aria-hidden="true" />
                    Switch
                  </button>
                  <Link
                    href={
                      currentSession.isPrincipal
                        ? "/principal"
                        : currentSession.isAdmin
                        ? "/admin"
                        : "/lead"
                    }
                    className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-colors"
                  >
                    Workspace →
                  </Link>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                id="login-error-msg"
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate={false}>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Campus Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (activePersonaId) setActivePersonaId(null);
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error-msg" : undefined}
                    placeholder="name@campus.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (activePersonaId) setActivePersonaId(null);
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error-msg" : undefined}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shadow-indigo-600/25"
              >
                {loading ? (
                  <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    role="status"
                    aria-label="Signing in..."
                  />
                ) : (
                  <>
                    <span>Sign In to SaveSlot</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts Switcher with Color Accents */}
            {SHOW_DEMO_PERSONAS && DEMO_PERSONAS.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    One-Click Demo Personas
                  </span>
                  {activePersonaId && (
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      Ready
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {DEMO_PERSONAS.map((p) => {
                    const isSelected = activePersonaId === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={loading}
                        onClick={() => selectPersona(p)}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? p.activeClass
                            : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${p.iconBg}`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${p.iconColor}`} aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate leading-tight">
                              {p.role}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                              {p.department}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${p.tagStyle}`}
                          >
                            {p.shortTag}
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-colors ${
                              isSelected ? "text-slate-900" : "text-slate-300"
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quiet institutional notice */}
        <p className="text-center text-[11px] text-slate-500 mt-4 leading-normal">
          Restricted access. Public student registration is disabled; credentials are provisioned exclusively by Campus Administration.
        </p>
      </div>

      {/* Footer copyright */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-slate-400">
        © 2026 Albertian Institute of Science & Technology (AISAT)
      </div>
    </div>
  );
}
