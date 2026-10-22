"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { authApi } from "@/features/auth/api";
import { formatDisplayName } from "@/lib/utils";
import { UserAvatar } from "@/components/ui";
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
  Check,
  GraduationCap,
} from "lucide-react";

interface DemoAccount {
  id: string;
  name: string;
  role: string;
  context: string;
  email: string;
  password: string;
  badge: string;
  icon: typeof Shield;
  iconBg: string;
  iconColor: string;
  badgeStyle: string;
}

const SHOW_DEMO_PERSONAS =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGINS === "true" ||
  process.env.NODE_ENV !== "production";

const DEMO_PERSONAS: DemoAccount[] = SHOW_DEMO_PERSONAS
  ? [
      {
        id: "principal",
        name: "Principal",
        role: "College Principal",
        context: "Executive Office",
        email: "principal@campus.edu",
        password: "principal123",
        badge: "Executive",
        icon: GraduationCap,
        iconBg: "bg-purple-50 text-purple-700 border-purple-200/70",
        iconColor: "text-purple-700",
        badgeStyle: "bg-purple-50 text-purple-700 border-purple-200/70",
      },
      {
        id: "vice_principal",
        name: "Vice Principal",
        role: "Vice Principal",
        context: "Academic Review",
        email: "viceprincipal@campus.edu",
        password: "viceprincipal123",
        badge: "Academic",
        icon: GraduationCap,
        iconBg: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
        iconColor: "text-indigo-700",
        badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
      },
      {
        id: "admin",
        name: "Campus Admin",
        role: "Campus Admin",
        context: "Student Affairs",
        email: "admin@campus.edu",
        password: "admin123",
        badge: "Operations",
        icon: Shield,
        iconBg: "bg-amber-50 text-amber-700 border-amber-200/70",
        iconColor: "text-amber-700",
        badgeStyle: "bg-amber-50 text-amber-800 border-amber-200/70",
      },
      {
        id: "coding",
        name: "Coding Club",
        role: "Coding Club Lead",
        context: "Tech Lead",
        email: "lead.coding@campus.edu",
        password: "lead123",
        badge: "Tech",
        icon: Code2,
        iconBg: "bg-sky-50 text-sky-700 border-sky-200/70",
        iconColor: "text-sky-700",
        badgeStyle: "bg-sky-50 text-sky-700 border-sky-200/70",
      },
      {
        id: "design",
        name: "Design Society",
        role: "Design Society Lead",
        context: "Media & Arts",
        email: "lead.design@campus.edu",
        password: "lead123",
        badge: "Arts",
        icon: Palette,
        iconBg: "bg-rose-50 text-rose-700 border-rose-200/70",
        iconColor: "text-rose-700",
        badgeStyle: "bg-rose-50 text-rose-700 border-rose-200/70",
      },
      {
        id: "ecell",
        name: "E-Cell",
        role: "E-Cell Lead",
        context: "Incubation",
        email: "lead.ecell@campus.edu",
        password: "lead123",
        badge: "Career",
        icon: Briefcase,
        iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
        iconColor: "text-emerald-700",
        badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
      },
    ]
  : [];

function LoginParamsHandler({
  onSetError,
  onSetSuccess,
  onSetRedirect,
}: {
  onSetError: (msg: string) => void;
  onSetSuccess: (msg: string) => void;
  onSetRedirect: (url: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      onSetSuccess("Password successfully updated. Please sign in with your new credentials.");
    }
    if (searchParams.get("error") === "admin_required") {
      onSetError(
        "Administrative privileges required to access the Admin Console. Please sign in with an Administrator account."
      );
    }
    if (searchParams.get("error") === "principal_required") {
      onSetError(
        "Executive privileges required to access the Principal Desk. Please sign in with an authorized Principal or Vice-Principal account."
      );
    }
    if (searchParams.get("error") === "lead_required") {
      onSetError(
        "Community Lead privileges required to access the Lead Workspace. Please sign in with an authorized Lead account."
      );
    }
    const redirectParam = searchParams.get("redirect") || searchParams.get("returnTo");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      onSetRedirect(redirectParam);
    }
  }, [searchParams, onSetError, onSetSuccess, onSetRedirect]);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [customRedirect, setCustomRedirect] = useState<string | null>(null);
  const { user, logout, isLoggingOut, refreshSession } = useAuth();

  const handleSignOutExisting = async () => {
    await logout();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await authApi.login({ email: email.trim(), password });

      await refreshSession(true);
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
    setSuccessMessage(null);
  }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between bg-zinc-50/50 py-5 sm:py-8 px-4 sm:px-6">
      <Suspense fallback={null}>
        <LoginParamsHandler
          onSetError={setError}
          onSetSuccess={setSuccessMessage}
          onSetRedirect={setCustomRedirect}
        />
      </Suspense>

      {/* Top navigation row with subtle institutional accent */}
      <div className="w-full max-w-md sm:max-w-[460px] mx-auto flex items-center justify-between shrink-0 mb-4 sm:mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" aria-hidden="true" />
          <span>Public Schedule</span>
        </Link>
        <span className="text-[11px] font-semibold text-zinc-700 bg-white px-2.5 py-0.5 rounded-full border border-zinc-200/80 shadow-2xs">
          AISAT Kochi • Academic Portal
        </span>
      </div>

      {/* Central Login Card */}
      <div className="w-full max-w-md sm:max-w-[460px] mx-auto my-auto py-2 shrink-0">
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs sm:shadow-sm">
          <div className="p-5 sm:p-7">
            {/* Institution Brand Header */}
            <div className="mb-6 flex items-center gap-3.5">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-2xs shrink-0 ring-1 ring-zinc-900/5 bg-zinc-950 flex items-center justify-center p-1.5">
                <Image
                  src="/icon.png"
                  alt="SaveSlot"
                  width={44}
                  height={44}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
                    Save<span className="text-indigo-600">Slot</span> Portal
                  </h1>
                </div>
                <p className="text-xs text-zinc-500 font-medium truncate">
                  Albertian Institute of Science & Technology
                </p>
              </div>
            </div>

            {/* Existing Active Session Banner */}
            {user && (
              <div className="mb-5 p-3 rounded-xl border border-indigo-200/80 bg-indigo-50/50 text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    name={formatDisplayName(user.fullName)}
                    email={user.email}
                    role={user.role}
                    avatarUrl={user.avatarUrl}
                    size={30}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-500">Signed in as:</div>
                    <div className="font-semibold text-zinc-900 truncate">
                      {formatDisplayName(user.fullName)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSignOutExisting}
                    disabled={isLoggingOut}
                    className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    <LogOut className="w-3 h-3 inline mr-1 text-zinc-500" aria-hidden="true" />
                    Switch
                  </button>
                  <Link
                    href={
                      user.isAdmin
                        ? "/admin"
                        : user.isPrincipal || user.isVicePrincipal
                        ? "/principal"
                        : user.isLead
                        ? "/lead"
                        : "/"
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    Workspace →
                  </Link>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 p-3 rounded-xl border border-emerald-200/90 bg-emerald-50/60 text-emerald-900 text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                id="login-error-msg"
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3 rounded-xl border border-rose-200/90 bg-rose-50/60 text-rose-900 text-xs flex items-start gap-2.5"
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
                  className="block text-xs font-semibold text-zinc-900 mb-1.5"
                >
                  Campus Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none"
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
                      if (successMessage) setSuccessMessage(null);
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error-msg" : undefined}
                    placeholder="name@campus.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/90 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-zinc-900"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none"
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
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/90 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-2.5 p-1 text-zinc-400 hover:text-zinc-700 focus:outline-none cursor-pointer disabled:opacity-50 transition-colors"
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
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs shadow-indigo-600/20 active:scale-[0.98]"
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
              <div className="mt-5 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    One-Click Demo Personas
                  </span>
                  {activePersonaId ? (
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      Ready to Sign In
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Click to autofill
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map((p) => {
                    const isSelected = activePersonaId === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={loading}
                        onClick={() => selectPersona(p)}
                        className={`text-left p-2 rounded-xl border transition-all text-xs flex items-center justify-between gap-1.5 cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20 shadow-2xs"
                            : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${p.iconBg}`}
                          >
                            <Icon className={`w-3 h-3 ${p.iconColor}`} aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[11px] sm:text-xs text-zinc-900 truncate leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-zinc-500 truncate leading-tight mt-0.5">
                              {p.context}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 hidden xs:block">
                          <span
                            className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded font-semibold border ${p.badgeStyle}`}
                          >
                            {p.badge}
                          </span>
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
        <p className="text-center text-[11px] text-zinc-500 mt-3.5 leading-normal">
          Restricted access. Public student registration is disabled; credentials are provisioned exclusively by Campus Administration.
        </p>
      </div>

      {/* Footer copyright */}
      <div className="w-full max-w-md sm:max-w-[460px] mx-auto text-center text-[11px] text-zinc-400 shrink-0 mt-4">
        © 2026 Albertian Institute of Science & Technology (AISAT)
      </div>
    </div>
  );
}
