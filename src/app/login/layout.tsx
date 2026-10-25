import type { Metadata } from "next";
import React from "react";
import { campusConfig } from "@/lib/config/campus";

export const metadata: Metadata = {
  title: `Staff Sign In • SaveSlot • ${campusConfig.shortName}`,
  description:
    `Sign in to access the SaveSlot campus workspace for ${campusConfig.name} community leads and administration.`,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
