import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://astropost.com";
  const lastModified = new Date();

  const routes = [
    "",
    "/login",
    "/register",
    "/pricing",
    "/blog",
    "/changelog",
    "/docs",
    "/legal/privacy",
    "/legal/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  return routes;
}
