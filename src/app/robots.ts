import type { MetadataRoute } from "next";
import { campusConfig } from "@/lib/config/campus";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = campusConfig.siteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/forgot-password", "/reset-password"],
        disallow: ["/admin/", "/lead/", "/principal/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
