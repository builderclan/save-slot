import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(dateString: string): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
    if (isToday(date)) return `Today, ${format(date, "MMM d")}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, "MMM d")}`;
    return format(date, "EEE, MMM d");
  } catch {
    return dateString;
  }
}

export function formatEventTimeRange(startStr: string, endStr: string): string {
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  } catch {
    return `${startStr} - ${endStr}`;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
