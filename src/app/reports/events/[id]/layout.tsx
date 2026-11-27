import type { ReactNode } from "react";

/** Minimal print-ready wrapper — white background without nested html/body */
export default function DossierLayout({ children }: { children: ReactNode }) {
  return <div className="bg-white min-h-screen">{children}</div>;
}
