import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://traceiqoffi.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/sign-in", "/sign-up"],
        disallow: [
          "/dashboard",
          "/repositories",
          "/requirements",
          "/analysis",
          "/pr-reviews",
          "/pull-requests",
          "/traceability",
          "/workspaces",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
