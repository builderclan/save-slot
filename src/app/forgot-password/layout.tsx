import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Forgot Password • SaveSlot • AISAT",
  description: "Request a password reset link for your SaveSlot campus account.",
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
