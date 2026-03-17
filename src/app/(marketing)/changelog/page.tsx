import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Stay up to date with the latest features and improvements to AstraPost.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Changelog — AstraPost",
    description: "Stay up to date with the latest features and improvements to AstraPost.",
    url: "/changelog",
  },
};

export default function ChangelogPage() {
  const releases = [
    {
      version: "v1.2.0",
      date: "March 12, 2026",
      title: "AI-Powered Content Suite",
      description: "Massive AI expansion with image generation, viral analysis, and content inspiration features.",
      changes: [
        { type: "new", content: "AI Image Generation: Create stunning images directly in Composer using Flux AI models." },
        { type: "new", content: "Inspiration Feature: Import public tweets from X/Twitter and adapt them for your content." },
        { type: "new", content: "AI Hashtag Generator: Generate relevant hashtags for your tweets in multiple languages." },
        { type: "new", content: "Viral Content Analyzer: Discover what makes your content go viral with pattern analysis." },
        { type: "new", content: "AI Content Inspiration: Get creative ideas with Gemini-powered suggestions." },
        { type: "new", content: "Tweet Bookmark System: Save and organize inspiring tweets for later reference." },
        { type: "new", content: "Manual Editor with Similarity Check: Ensure your content is unique before posting." },
        { type: "new", content: "Multi-Language Support: Generate content in 10 languages including Arabic (MENA optimized)." },
        { type: "imp", content: "Thread Writer: Added 7 tone options including humorous and viral styles." },
        { type: "imp", content: "Expanded AI provider support: OpenRouter, Google Gemini, and Replicate integration." },
      ]
    },
    {
      version: "v1.1.0",
      date: "March 12, 2026",
      title: "Multi-Platform & Security",
      description: "Major update adding LinkedIn support, Admin dashboard, and critical security features.",
      changes: [
        { type: "new", content: "LinkedIn Support: Connect and post to LinkedIn profiles." },
        { type: "new", content: "Admin Dashboard: User management, metrics, and job monitoring." },
        { type: "new", content: "2FA Security: Secure your account with Two-Factor Authentication." },
        { type: "new", content: "GDPR Compliance: Export your data or delete your account." },
        { type: "imp", content: "Composer: Now supports multi-platform selection." },
        { type: "fix", content: "Improved scheduling reliability with BullMQ." },
      ]
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
      ]
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
      ]
    }
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <Badge variant="outline" className="px-4 py-1">Changelog</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Product Updates
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stay up to date with the latest features and improvements.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l border-muted ml-4 md:ml-8 space-y-12 pl-8 md:pl-12">
          {releases.map((release, index) => (
            <div key={index} className="relative">
              <div className="absolute -left-[2.35rem] md:-left-[3.35rem] top-1.5 h-3 w-3 rounded-full border-2 border-primary/40 bg-background ring-4 ring-primary/10" />

              <div className="flex flex-col md:flex-row gap-2 md:items-baseline mb-2">
                <h2 className="text-2xl font-bold">{release.title}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{release.version}</span>
                  <span>•</span>
                  <time className="text-sm">{release.date}</time>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl leading-relaxed">{release.description}</p>

              <ul className="space-y-3">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant={
                      change.type === "new" ? "default" :
                      change.type === "fix" ? "destructive" : "secondary"
                    } className="uppercase text-[10px] px-1.5 py-0.5 h-5 mt-0.5 shrink-0 w-12 justify-center">
                      {change.type}
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
