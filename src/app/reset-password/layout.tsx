import type { Metadata } from "next";
import React from "react";
import { campusConfig } from "@/lib/config/campus";

export const metadata: Metadata = {
  title: `Set New Password • SaveSlot • ${campusConfig.shortName}`,
  description: `Set a new secure password for your SaveSlot campus account at ${campusConfig.name}.`,
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
