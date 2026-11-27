import type { ReactNode } from "react";

/** Minimal layout: no navbar, white background — optimized for A4 print */
export default function DossierLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white antialiased">{children}</body>
    </html>
  );
}
