import Link from "next/link";
import { FileText, Rocket, Shield, CreditCard, LayoutGrid, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Everything you need to know about using AstraPost effectively.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Documentation — AstraPost",
    description: "Everything you need to know about using AstraPost effectively.",
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

export default async function DocsPage() {
  const t = await getTranslations("docs");

  const categories: Category[] = [
    {
      title: t("getting_started_title"),
      icon: <Rocket className="h-5 w-5" />,
      description: t("getting_started_desc"),
      articles: [
        { title: "Introduction to AstraPost", href: "/docs/intro", comingSoon: true },
        {
          title: "Connecting Your Social Accounts",
          href: "/docs/connecting-accounts",
          comingSoon: true,
        },
        { title: "Your First Post", href: "/docs/first-post", comingSoon: true },
      ],
    },
    {
      title: t("core_features_title"),
      icon: <LayoutGrid className="h-5 w-5" />,
      description: t("core_features_desc"),
      articles: [
        { title: "Using the Smart Scheduler", href: "/docs/scheduler", comingSoon: true },
        { title: "Generating Content with AI", href: "/docs/ai-writer", comingSoon: true },
        { title: "Creating Threads (Sard)", href: "/docs/threads", comingSoon: true },
        { title: "Affiliate Link Generator", href: "/docs/affiliate", comingSoon: true },
      ],
    },
    {
      title: t("account_billing_title"),
      icon: <CreditCard className="h-5 w-5" />,
      description: t("account_billing_desc"),
      articles: [
        { title: "Plans and Pricing", href: "/docs/pricing", comingSoon: true },
        { title: "Managing Your Subscription", href: "/docs/subscription", comingSoon: true },
        { title: "Team Management", href: "/docs/teams", comingSoon: true },
      ],
    },
    {
      title: t("security_privacy_title"),
      icon: <Shield className="h-5 w-5" />,
      description: t("security_privacy_desc"),
      articles: [
        { title: "Two-Factor Authentication", href: "/docs/2fa", comingSoon: true },
        { title: "GDPR & Data Export", href: "/docs/gdpr", comingSoon: true },
        { title: "Privacy Policy", href: "/legal/privacy" },
      ],
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-5xl space-y-12 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Badge variant="outline">{t("badge")}</Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">{t("subtitle")}</p>

          {/* Search */}
          <div className="relative mx-auto max-w-md pt-4">
            <Input
              type="search"
              placeholder={t("search_placeholder")}
              className="bg-card h-12 pl-10 shadow-sm"
            />
            <div className="text-muted-foreground absolute top-[calc(1rem+0.875rem)] left-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="grid gap-8 pt-8 md:grid-cols-2">
          {categories.map((category, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{category.title}</h2>
                  <p className="text-muted-foreground text-sm">{category.description}</p>
                </div>
              </div>

              <ul className="border-muted ml-12 space-y-3 border-l pl-4">
                {category.articles.map((article, i) => (
                  <li key={i}>
                    {article.comingSoon ? (
                      <span className="text-muted-foreground/60 flex cursor-default items-center text-sm font-medium select-none">
                        <FileText className="text-muted-foreground/40 mr-2 h-3.5 w-3.5 shrink-0" />
                        {article.title}
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/30 text-muted-foreground/50 ml-auto h-4 px-1.5 text-[10px]"
                        >
                          {t("soon_badge")}
                        </Badge>
                      </span>
                    ) : (
                      <Link
                        href={article.href}
                        className="group hover:text-primary flex items-center text-sm font-medium transition-colors"
                      >
                        <FileText className="text-muted-foreground group-hover:text-primary mr-2 h-3.5 w-3.5 shrink-0 transition-colors" />
                        {article.title}
                        <ArrowRight className="text-muted-foreground ms-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 rtl:scale-x-[-1]" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Support CTA */}
        <div className="bg-muted/30 mt-12 rounded-xl border border-dashed p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold">{t("cant_find")}</h3>
          <p className="text-muted-foreground mb-4">{t("support_help")}</p>
          <Link
            href="mailto:support@astrapost.com"
            className="text-primary group inline-flex items-center gap-1 font-medium hover:underline"
          >
            {t("contact_support")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
