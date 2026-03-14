import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://astropost.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/api/",
        "/profile/",
        "/chat/",
        "/onboarding/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
