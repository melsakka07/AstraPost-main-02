import { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://astropost.com";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    // Home — highest priority
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    // High-value conversion pages
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // Core feature/content pages
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // Supporting pages
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/community`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    // Auth pages
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    // Legal pages
    { url: `${baseUrl}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic blog posts
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAllBlogPosts();
    blogRoutes = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // Blog posts unavailable — skip dynamic routes
  }

  return [...staticRoutes, ...blogRoutes];
}
