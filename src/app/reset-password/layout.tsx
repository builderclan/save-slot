import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Set New Password • SaveSlot • AISAT",
  description: "Set a new secure password for your SaveSlot campus account.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
