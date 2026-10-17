import { revalidatePath } from "next/cache";

/**
 * Safely triggers Incremental Static Regeneration (ISR) revalidation for a given route path.
 * Gracefully ignores non-request environments (such as unit test runners) where
 * Next.js static generation stores are not mounted.
 */
export function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Non-production or test runner environment without active static generation store
  }
}
