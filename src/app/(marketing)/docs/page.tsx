import Link from "next/link";
import { FileText, Rocket, Shield, CreditCard, LayoutGrid, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Everything you need to know about using AstroPost effectively.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Documentation — AstroPost",
    description: "Everything you need to know about using AstroPost effectively.",
    url: "/docs",
  },
};

interface Article {
  title: string;
  href: string;
  comingSoon?: boolean;
}

interface Category {
  title: string;
  icon: React.ReactNode;
  description: string;
  articles: Article[];
}

export default function DocsPage() {
  const categories: Category[] = [
    {
      title: "Getting Started",
      icon: <Rocket className="h-5 w-5" />,
      description: "Learn the basics of setting up your AstroPost account.",
      articles: [
        { title: "Introduction to AstroPost", href: "/docs/intro", comingSoon: true },
        { title: "Connecting Your Social Accounts", href: "/docs/connecting-accounts", comingSoon: true },
        { title: "Your First Post", href: "/docs/first-post", comingSoon: true },
      ],
    },
    {
      title: "Core Features",
      icon: <LayoutGrid className="h-5 w-5" />,
      description: "Master the tools to create and schedule content.",
      articles: [
        { title: "Using the Smart Scheduler", href: "/docs/scheduler", comingSoon: true },
        { title: "Generating Content with AI", href: "/docs/ai-writer", comingSoon: true },
        { title: "Creating Threads (Sard)", href: "/docs/threads", comingSoon: true },
        { title: "Affiliate Link Generator", href: "/docs/affiliate", comingSoon: true },
      ],
    },
    {
      title: "Account & Billing",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Manage your subscription and team settings.",
      articles: [
        { title: "Plans and Pricing", href: "/docs/pricing", comingSoon: true },
        { title: "Managing Your Subscription", href: "/docs/subscription", comingSoon: true },
        { title: "Team Management", href: "/docs/teams", comingSoon: true },
      ],
    },
    {
      title: "Security & Privacy",
      icon: <Shield className="h-5 w-5" />,
      description: "How we protect your data and account.",
      articles: [
        { title: "Two-Factor Authentication", href: "/docs/2fa", comingSoon: true },
        { title: "GDPR & Data Export", href: "/docs/gdpr", comingSoon: true },
        { title: "Privacy Policy", href: "/legal/privacy" },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-6">
          <Badge variant="outline">Documentation</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            How can we help?
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Everything you need to know about using AstroPost effectively.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto pt-4">
            <Input
              type="search"
              placeholder="Search documentation..."
              className="pl-10 h-12 bg-card shadow-sm"
            />
            <div className="absolute left-3 top-[calc(1rem+0.875rem)] text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="grid md:grid-cols-2 gap-8 pt-8">
          {categories.map((category, index) => (
            <div key={index} className="bg-card border rounded-xl p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>

              <ul className="ml-12 space-y-3 border-l border-muted pl-4">
                {category.articles.map((article, i) => (
                  <li key={i}>
                    {article.comingSoon ? (
                      <span className="flex items-center text-sm font-medium text-muted-foreground/60 cursor-default select-none">
                        <FileText className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground/40" />
                        {article.title}
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] px-1.5 h-4 border-muted-foreground/30 text-muted-foreground/50"
                        >
                          Soon
                        </Badge>
                      </span>
                    ) : (
                      <Link
                        href={article.href}
                        className="group flex items-center text-sm font-medium hover:text-primary transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        {article.title}
                        <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Support CTA */}
        <div className="bg-muted/30 rounded-xl p-8 text-center mt-12 border border-dashed">
          <h3 className="text-lg font-semibold mb-2">Can&apos;t find what you&apos;re looking for?</h3>
          <p className="text-muted-foreground mb-4">Our support team is here to help you get back on track.</p>
          <Link href="mailto:support@astropost.com" className="text-primary font-medium hover:underline inline-flex items-center gap-1 group">
            Contact Support
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
