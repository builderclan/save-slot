"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  KeyRound,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/features/auth/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if redirect brought an error parameter
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setIsSessionValid(false);
      setError(
        errorParam === "invalid_token"
          ? "This password reset link is invalid or has expired."
          : decodeURIComponent(errorParam)
      );
      setCheckingSession(false);
      return;
    }

    // Verify recovery session availability
    const supabase = createClient();

    async function verifySession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsSessionValid(true);
        } else {
          // Check for hash recovery tokens or listen for session exchange
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || (session && session.user)) {
              setIsSessionValid(true);
            }
          });

          // Wait brief moment for client auth initialization
          setTimeout(async () => {
            const {
              data: { user: recheckUser },
            } = await supabase.auth.getUser();
            if (!recheckUser) {
              setIsSessionValid(false);
            }
            subscription.unsubscribe();
            setCheckingSession(false);
          }, 600);
          return;
        }
      } catch {
        setIsSessionValid(false);
      } finally {
        setCheckingSession(false);
      }
    }

    verifySession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authApi.confirmPasswordReset({ password, confirmPassword });

      // Success: redirect to /login with confirmation banner
      router.push("/login?reset=success");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto py-6">
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs sm:shadow-sm">
        <div className="p-6 sm:p-7">
          {/* Header */}
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
              <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
                Set New Password
              </h1>
              <p className="text-xs text-zinc-500 font-medium truncate">
                Albertian Institute of Science & Technology
              </p>
            </div>
          </div>

          {checkingSession ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500 font-medium">Verifying secure reset link...</p>
            </div>
          ) : !isSessionValid ? (
            /* Expired or Invalid Link Fallback State */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl border border-rose-200/90 bg-rose-50/60 text-rose-950 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="block text-sm font-semibold text-rose-900 mb-1">
                    Link Invalid or Expired
                  </strong>
                  <p className="text-rose-800 leading-relaxed">
                    This password reset link is invalid, expired, or has already been used. For
                    security, reset tokens are strictly single-use and time-limited.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-2xs shadow-indigo-600/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Request New Reset Link</span>
                </Link>

                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-2xs"
                >
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Valid Form */
            <>
              <p className="text-xs text-zinc-600 mb-5 leading-relaxed">
                Choose a strong new password for your account. Must be at least 6 characters long.
              </p>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-5 p-3 rounded-xl border border-rose-200/90 bg-rose-50/60 text-rose-900 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-semibold text-zinc-900 mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="reset-new-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
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

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-zinc-900 mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/90 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all disabled:bg-zinc-50 disabled:text-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={loading}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-2.5 top-2.5 p-1 text-zinc-400 hover:text-zinc-700 focus:outline-none cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {showConfirmPassword ? (
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
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </span>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="px-6 py-3.5 bg-zinc-50/70 border-t border-zinc-100 rounded-b-2xl flex items-center justify-center">
          <span className="text-[11px] text-zinc-500">
            Remember your old password?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between bg-zinc-50/50 py-8 px-4 sm:px-6">
      {/* Top navigation row */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" aria-hidden="true" />
          <span>Back to Sign In</span>
        </Link>
        <span className="text-[11px] font-semibold text-zinc-700 bg-white px-2.5 py-0.5 rounded-full border border-zinc-200/80 shadow-2xs">
          AISAT Kochi • Academic Portal
        </span>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md mx-auto my-auto py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>

      {/* Footer disclaimer */}
      <div className="w-full max-w-md mx-auto text-center">
        <p className="text-[11px] text-zinc-400">
          SaveSlot Event Governance Platform • AISAT Kochi
        </p>
      </div>
    </div>
  );
}
