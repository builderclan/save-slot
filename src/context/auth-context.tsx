"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isAdmin: boolean;
  isPrincipal: boolean;
  isVicePrincipal?: boolean;
  isLead: boolean;
  leadCommunities: Array<{ id: string; name: string; slug: string }>;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoggingOut: boolean;
  refreshSession: (force?: boolean) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Client-side cache and in-flight promise deduplication
let inFlightAuthPromise: Promise<AuthUser | null> | null = null;
let cachedSession: { user: AuthUser | null; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds client-side cache

/**
 * Resets internal auth memory cache (primarily used in test teardown or logout)
 */
export function _clearAuthCache() {
  cachedSession = null;
  inFlightAuthPromise = null;
}

async function fetchMe(force = false): Promise<AuthUser | null> {
  const now = Date.now();
  if (!force && cachedSession && now - cachedSession.timestamp < CACHE_TTL_MS) {
    return cachedSession.user;
  }

  if (inFlightAuthPromise) {
    return inFlightAuthPromise;
  }

  inFlightAuthPromise = (async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        cachedSession = { user: null, timestamp: Date.now() };
        return null;
      }
      const data = await res.json();
      const user = data.authenticated && data.user ? (data.user as AuthUser) : null;
      cachedSession = { user, timestamp: Date.now() };
      return user;
    } catch (err) {
      console.error("[AuthContext] Failed to fetch session:", err);
      return null;
    } finally {
      inFlightAuthPromise = null;
    }
  })();

  return inFlightAuthPromise;
}

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (initialUser) {
      cachedSession = { user: initialUser, timestamp: Date.now() };
      return initialUser;
    }
    return cachedSession ? cachedSession.user : null;
  });
  const [loading, setLoading] = useState<boolean>(!initialUser && !cachedSession);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const router = useRouter();
  const mountedRef = useRef(true);

  const refreshSession = useCallback(async (force = false) => {
    try {
      const freshUser = await fetchMe(force);
      if (mountedRef.current) {
        setUser(freshUser);
        setLoading(false);
      }
      return freshUser;
    } catch {
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!initialUser && !cachedSession) {
      refreshSession(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [initialUser, refreshSession]);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[AuthContext] Logout error:", err);
    } finally {
      cachedSession = { user: null, timestamp: Date.now() };
      if (mountedRef.current) {
        setUser(null);
        setIsLoggingOut(false);
      }
      router.push("/");
      router.refresh();
    }
  }, [router, isLoggingOut]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoggingOut,
      refreshSession: (force = true) => refreshSession(force),
      logout,
    }),
    [user, loading, isLoggingOut, refreshSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
