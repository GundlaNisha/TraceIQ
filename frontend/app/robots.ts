import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://traceiqoffi.vercel.app").replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/docs",
          "/contact",
          "/privacy",
          "/terms",
          "/rss.xml",
          "/sitemap.xml",
          "/login",
          "/signup",
          "/sign-in",
          "/sign-up",
        ],
        disallow: [
          "/agent",
          "/analysis",
          "/dashboard",
          "/join",
          "/pr-drafts",
          "/pr-reviews",
          "/pull-requests",
          "/repositories",
          "/requirements",
          "/traceability",
          "/workspaces",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
