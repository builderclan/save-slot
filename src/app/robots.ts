import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://saveslot.aisat.ac.in";

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
