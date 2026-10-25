import type { Metadata } from "next";
import React from "react";
import { campusConfig } from "@/lib/config/campus";

export const metadata: Metadata = {
  title: `Forgot Password • SaveSlot • ${campusConfig.shortName}`,
  description: `Request a password reset link for your SaveSlot account at ${campusConfig.name}.`,
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
