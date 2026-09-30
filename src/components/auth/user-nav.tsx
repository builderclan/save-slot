"use client";

import * as React from "react";
import { User, Building2, LogOut, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "organizer" | "admin";
  avatar_url?: string;
}

interface CampusInfo {
  id: string;
  name: string;
  slug: string;
}

interface SessionData {
  authenticated: boolean;
  user: SessionUser | null;
  campus: CampusInfo | null;
  isCampusAdmin?: boolean;
}

const DEV_PERSONAS = [
  {
    name: "Alex Rivera",
    role: "organizer",
    roleLabel: "Organizer Lead (Apex)",
    email: "alex.rivera.apex@gmail.com",
    campus: "Apex Tech",
  },
  {
    name: "Maya Lin",
    role: "organizer",
    roleLabel: "Design Lead (Apex)",
    email: "maya.lin.apex@gmail.com",
    campus: "Apex Tech",
  },
  {
    name: "Admin Apex",
    role: "admin",
    roleLabel: "Campus Admin (Apex)",
    email: "admin.apex@gmail.com",
    campus: "Apex Tech",
  },
  {
    name: "Jordan Smith",
    role: "student",
    roleLabel: "Student (Apex)",
    email: "student.apex@gmail.com",
    campus: "Apex Tech",
  },
  {
    name: "Pacific Organizer",
    role: "organizer",
    roleLabel: "Organizer Lead (Pacific)",
    email: "organizer.pacific@gmail.com",
    campus: "Pacific Coast",
  },
  {
    name: "Admin Pacific",
    role: "admin",
    roleLabel: "Campus Admin (Pacific)",
    email: "admin.pacific@gmail.com",
    campus: "Pacific Coast",
  },
];

export function UserNav() {
  const [session, setSession] = React.useState<SessionData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const fetchSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignInAs = async (email: string) => {
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      if (res.ok) {
        await fetchSession();
        window.location.reload();
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setSwitching(false);
      setMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    setSwitching(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await fetchSession();
      window.location.reload();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setSwitching(false);
      setMenuOpen(false);
    }
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />;
  }

  const isDev = process.env.NODE_ENV !== "production";
  const user = session?.user;
  const campus = session?.campus;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={switching}
        className={cn(
          "flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition text-xs text-slate-700 shadow-2xs",
          switching && "opacity-50 pointer-events-none"
        )}
      >
        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
          {user ? (
            user.name.slice(0, 1).toUpperCase()
          ) : (
            <User className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-900 leading-tight">
            {user ? user.name : "Guest"}
          </span>
          {user && (
            <span className="text-[10px] text-slate-500 leading-none capitalize">
              {user.role} {campus ? `• ${campus.slug}` : ""}
            </span>
          )}
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
          {/* Current User Header */}
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900">
              {user ? user.name : "Not signed in"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {user ? user.email : "Browsing as guest"}
            </p>
            {campus && (
              <p className="text-[10px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {campus.name}
              </p>
            )}
          </div>

          {/* Dev Persona Switcher (strictly in development mode) */}
          {isDev && (
            <div className="p-2 border-b border-slate-100">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dev Persona Switcher
              </div>
              <div className="space-y-0.5 mt-1">
                {DEV_PERSONAS.map((persona) => {
                  const isCurrent = user?.email === persona.email;
                  return (
                    <button
                      key={persona.email}
                      onClick={() => handleSignInAs(persona.email)}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition",
                        isCurrent
                          ? "bg-blue-50 text-blue-900 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{persona.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {persona.roleLabel}
                        </span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-2 pt-1">
            {user ? (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => handleSignInAs("alex.rivera.apex@gmail.com")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition font-medium"
              >
                Sign In (Demo Organizer)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
