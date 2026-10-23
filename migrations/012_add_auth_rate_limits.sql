-- Migration 012: Add Persistent Auth Rate Limits Table
-- Enables distributed, serverless-safe failed login rate limiting across all Vercel instances.

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key VARCHAR(255) PRIMARY KEY,
    failed_attempts INT NOT NULL DEFAULT 1,
    first_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of stale entries
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_updated_at ON public.auth_rate_limits (updated_at);

-- Security Hardening: Enable RLS and isolate from client access
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;
