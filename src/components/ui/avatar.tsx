"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Blobatar } from "@blobatar/react";
import type { UserRole } from "@/types/database";

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  role?: UserRole | string;
  avatarUrl?: string | null;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap: Record<string, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

export function UserAvatar({
  name,
  email,
  role,
  avatarUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageError = Boolean(avatarUrl && failedUrl === avatarUrl);
  const pixelSize = typeof size === "number" ? size : sizeMap[size] || 32;

  // Derive unique deterministic seed strictly from user's name
  const seed = name?.trim() || "User";

  // Role-tinted ring styling
  const roleRing =
    role === "principal" || role === "vice_principal"
      ? "ring-1 ring-purple-300/80"
      : role === "admin"
      ? "ring-1 ring-amber-300/80"
      : role === "organizer" || role === "lead"
      ? "ring-1 ring-indigo-300/80"
      : "ring-1 ring-zinc-200/80";

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-zinc-100 shadow-2xs select-none ${roleRing} ${className}`}
      title={name || email || undefined}
    >
      {avatarUrl && !imageError ? (
        <Image
          src={avatarUrl}
          alt={name || "User Avatar"}
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <Blobatar
          name={seed}
          size={pixelSize}
          className="w-full h-full"
        />
      )}
    </div>
  );
}
