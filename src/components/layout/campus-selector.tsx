"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
import { Campus } from "@/types/database";

const DEFAULT_CAMPUSES: Array<Pick<Campus, "id" | "name" | "slug">> = [
  {
    id: "dba2755a-f690-4381-bdc3-f3b252e24be0",
    name: "Apex Institute of Technology",
    slug: "apex-tech",
  },
  {
    id: "de196a36-6173-42bb-9a3c-be73b9c0e8ef",
    name: "Pacific Coast University",
    slug: "pacific-coast",
  },
];

export function CampusSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const [campuses, setCampuses] = React.useState(DEFAULT_CAMPUSES);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Determine current active campus from route
  const currentCampusSlug = React.useMemo(() => {
    const match = pathname.match(/^\/campus\/([^/]+)/);
    if (match) return match[1];
    return "apex-tech";
  }, [pathname]);

  const activeCampus = campuses.find((c) => c.slug === currentCampusSlug) || campuses[0];

  React.useEffect(() => {
    fetch("/api/campuses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.campuses && Array.isArray(data.campuses) && data.campuses.length > 0) {
          setCampuses(data.campuses);
        }
      })
      .catch(() => {
        // Fallback to default campuses
      });
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCampus = (slug: string) => {
    setIsOpen(false);
    if (slug === "apex-tech") {
      router.push("/");
    } else {
      router.push(`/campus/${slug}`);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-800 transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
        aria-label="Select Campus"
        aria-expanded={isOpen}
      >
        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-[180px] md:max-w-[220px]">
          {activeCampus.name}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Select Campus
          </div>
          <div className="p-1 space-y-0.5">
            {campuses.map((campus) => {
              const isSelected = campus.slug === currentCampusSlug;
              return (
                <button
                  key={campus.slug}
                  onClick={() => handleSelectCampus(campus.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="truncate">{campus.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      /{campus.slug}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
