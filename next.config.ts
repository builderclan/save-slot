import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/campus/:campusSlug",
        destination: "/",
      },
      {
        source: "/campus/:campusSlug/events/:slug",
        destination: "/events/:slug",
      },
      {
        source: "/campus/:campusSlug/communities",
        destination: "/communities",
      },
      {
        source: "/campus/:campusSlug/communities/:slug",
        destination: "/communities/:slug",
      },
    ];
  },
};

export default nextConfig;
