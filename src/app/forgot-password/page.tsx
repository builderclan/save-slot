"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { authApi } from "@/features/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your campus email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.requestPasswordReset({ email: email.trim() });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between bg-gradient-to-b from-indigo-50/30 via-slate-50/50 to-slate-50 py-8 px-4 sm:px-6">
      {/* Top navigation row */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Back to Sign In</span>
        </Link>
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
          AISAT Kochi
        </span>
      </div>

      {/* Main card */}
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
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Reset Password
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  Albertian Institute of Science & Technology
                </p>
              </div>
            </div>

            {submitted ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 text-xs flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="block text-sm font-semibold text-emerald-900 mb-1">
                      Check your email inbox
                    </strong>
                    <p className="text-emerald-800 leading-relaxed">
                      If an account exists with{" "}
                      <span className="font-semibold text-emerald-950">{email}</span>, we have
                      sent a secure password recovery link.
                    </p>
                    <p className="text-emerald-700 mt-2 text-[11px]">
                      The link will expire shortly. Be sure to check your spam or junk folder if you
                      do not see it.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setError(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Send to a different email
                  </button>

                  <Link
                    href="/login"
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-xs shadow-indigo-600/25"
                  >
                    <span>Return to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Enter your registered campus email address. We will send you a secure link to
                  reset your password.
                </p>

                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle
                      className="w-4 h-4 shrink-0 mt-0.5 text-rose-600"
                      aria-hidden="true"
                    />
                    <div className="flex-1 font-medium">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="forgot-email"
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
                        id="forgot-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        disabled={loading}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="name@campus.edu"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shadow-indigo-600/25 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending Link...</span>
                      </span>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-center">
            <span className="text-[11px] text-slate-500">
              Need assistance? Contact your{" "}
              <span className="font-medium text-slate-700">Campus Administrator</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="w-full max-w-md mx-auto text-center">
        <p className="text-[11px] text-slate-400">
          SaveSlot Event Governance Platform • AISAT Kochi
        </p>
      </div>
    </div>
  );
}
