import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Staff Sign In • SaveSlot • AISAT",
  description:
    "Sign in to access the SaveSlot campus workspace for community leads and administration.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
