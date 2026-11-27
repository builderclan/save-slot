"use client";

import { useState, useCallback } from "react";
import type { SummaryRegisterFilters, SummaryRegisterPayload } from "@/server/reports";

const DEFAULT_FILTERS: SummaryRegisterFilters = {};

export function useSummaryRegister() {
  const [filters, setFilters] = useState<SummaryRegisterFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<SummaryRegisterPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const buildQueryString = useCallback(
    (f: SummaryRegisterFilters, fmt?: string) => {
      const p = new URLSearchParams();
      if (f.academicYear) p.set("academicYear", f.academicYear);
      if (f.startDate) p.set("startDate", f.startDate);
      if (f.endDate) p.set("endDate", f.endDate);
      if (f.originType) p.set("originType", f.originType);
      if (f.communityScope) p.set("communityScope", f.communityScope);
      if (f.departmentId) p.set("departmentId", f.departmentId);
      if (f.status) p.set("status", f.status);
      if (f.search) p.set("search", f.search);
      if (fmt) p.set("format", fmt);
      return p.toString();
    },
    []
  );

  const loadRegister = useCallback(
    async (nextFilters?: SummaryRegisterFilters) => {
      const active = nextFilters ?? filters;
      setLoading(true);
      setError(null);
      try {
        const qs = buildQueryString(active);
        const res = await fetch(`/api/reports/summary?${qs}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const payload: SummaryRegisterPayload = await res.json();
        setData(payload);
        setInitialized(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load register");
      } finally {
        setLoading(false);
      }
    },
    [filters, buildQueryString]
  );

  const downloadCsv = useCallback(
    (currentFilters?: SummaryRegisterFilters) => {
      const active = currentFilters ?? filters;
      const qs = buildQueryString(active, "csv");
      window.open(`/api/reports/summary?${qs}`, "_blank");
    },
    [filters, buildQueryString]
  );

  const updateFilter = useCallback(
    <K extends keyof SummaryRegisterFilters>(key: K, value: SummaryRegisterFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    filters,
    updateFilter,
    resetFilters,
    data,
    loading,
    error,
    initialized,
    loadRegister,
    downloadCsv,
  };
}
