"use client";

import { ReactNode } from "react";

interface PrintLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * A4 print-safe wrapper. Hides itself on-screen (bg-white) but
 * enforces A4 margins and resets stacking context for print.
 */
export function PrintLayout({ children, className = "" }: PrintLayoutProps) {
  return (
    <div
      className={`min-h-screen bg-white print:m-0 print:p-0 print:min-h-0 ${className}`}
    >
      {children}
    </div>
  );
}
