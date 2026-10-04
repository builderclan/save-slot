import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips redundant parenthetical roles from display names so they don't clash with role badges.
 * e.g. "Dr. K. S. Mathew (Principal)" -> "Dr. K. S. Mathew"
 */
export function formatDisplayName(name?: string | null): string {
  if (!name) return "";
  return name.replace(/\s*\((Principal|Vice Principal|Admin|Campus Admin|Community Lead|Lead)\)/gi, "").trim();
}

