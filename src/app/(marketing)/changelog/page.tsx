import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Changelog", ar: "سجل التغييرات" },
    {
      en: "Stay up to date with the latest features and improvements to AstraPost.",
      ar: "ابق على اطلاع بأحدث الميزات والتحسينات في AstraPost.",
    },
    { path: "/changelog" }
  );
}

export default async function ChangelogPage() {
  const t = await getTranslations("changelog");
  const typeLabels: Record<string, string> = {
    new: t("type_new"),
    imp: t("type_imp"),
    fix: t("type_fix"),
  };
  const releases = [
    {
      version: "v1.2.0",
      date: "March 12, 2026",
      title: "AI-Powered Content Suite",
      description:
        "Massive AI expansion with image generation, viral analysis, and content inspiration features.",
      changes: [
        {
          type: "new",
          content:
            "AI Image Generation: Create stunning images directly in Composer using Flux AI models.",
        },
        {
          type: "new",
          content:
            "Inspiration Feature: Import public tweets from X/Twitter and adapt them for your content.",
        },
        {
          type: "new",
          content:
            "AI Hashtag Generator: Generate relevant hashtags for your tweets in multiple languages.",
        },
        {
          type: "new",
          content:
            "Viral Content Analyzer: Discover what makes your content go viral with pattern analysis.",
        },
        {
          type: "new",
          content: "AI Content Inspiration: Get creative ideas with Gemini-powered suggestions.",
        },
        {
          type: "new",
          content: "Tweet Bookmark System: Save and organize inspiring tweets for later reference.",
        },
        {
          type: "new",
          content:
            "Manual Editor with Similarity Check: Ensure your content is unique before posting.",
        },
        {
          type: "new",
          content:
            "Multi-Language Support: Generate content in 10 languages including Arabic (MENA optimized).",
        },
        {
          type: "imp",
          content: "Thread Writer: Added 7 tone options including humorous and viral styles.",
        },
        {
          type: "imp",
          content:
            "Expanded AI provider support: OpenRouter, Google Gemini, and Replicate integration.",
        },
      ],
    },
    {
      version: "v1.1.0",
      date: "March 12, 2026",
      title: "Multi-Platform & Security",
      description:
        "Major update adding LinkedIn support, Admin dashboard, and critical security features.",
      changes: [
        { type: "new", content: "LinkedIn Support: Connect and post to LinkedIn profiles." },
        { type: "new", content: "Admin Dashboard: User management, metrics, and job monitoring." },
        {
          type: "new",
          content: "2FA Security: Secure your account with Two-Factor Authentication.",
        },
        { type: "new", content: "GDPR Compliance: Export your data or delete your account." },
        { type: "imp", content: "Composer: Now supports multi-platform selection." },
        { type: "fix", content: "Improved scheduling reliability with BullMQ." },
      ],
    },
    {
      version: "v1.0.0",
      date: "March 10, 2026",
      title: "Official Launch",
      description: "We are out of beta! AstraPost is now available for everyone.",
      changes: [
        { type: "new", content: "Smart Scheduler: Drag & drop calendar interface." },
        { type: "new", content: "AI Writer: Generate threads and hooks using GPT-4o." },
        { type: "new", content: "Affiliate Generator: Create product promotion tweets instantly." },
        { type: "new", content: "Analytics Dashboard: Track impressions and engagement." },
        { type: "fix", content: "Resolved authentication issues with X API." },
      ],
    },
    {
      version: "v0.9.0",
      date: "February 20, 2026",
      title: "Beta Preview",
      description: "Private beta release for early adopters.",
      changes: [
        { type: "new", content: "Basic post composer." },
        { type: "new", content: "User authentication via Twitter." },
        { type: "imp", content: "Improved mobile responsiveness." },
      ],
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-4xl space-y-12 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="px-4 py-1">
            {t("badge")}
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Timeline */}
        <div className="border-muted relative ml-4 space-y-12 border-l pl-8 md:ml-8 md:pl-12">
          {releases.map((release, index) => (
            <div key={index} className="relative">
              <div className="border-primary/40 bg-background ring-primary/10 absolute top-1.5 -left-[2.35rem] h-3 w-3 rounded-full border-2 ring-4 md:-left-[3.35rem]" />

              <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-baseline">
                <h2 className="text-2xl font-bold">{release.title}</h2>
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="bg-muted rounded px-2 py-0.5 font-mono text-sm">
                    {release.version}
                  </span>
                  <span>•</span>
                  <time className="text-sm">{release.date}</time>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl leading-relaxed">
                {release.description}
              </p>

              <ul className="space-y-3">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Badge
                      variant={
                        change.type === "new"
                          ? "default"
                          : change.type === "fix"
                            ? "destructive"
                            : "secondary"
                      }
                      className="mt-0.5 h-5 w-12 shrink-0 justify-center px-1.5 py-0.5 text-[10px] uppercase"
                    >
                      {typeLabels[change.type]}
                    </Badge>
                    <span className="text-foreground/90 leading-relaxed">{change.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
