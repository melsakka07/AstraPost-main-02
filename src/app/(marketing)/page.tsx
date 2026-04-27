import Link from "next/link";
import { Rocket, Calendar, Sparkles, BarChart2, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { SocialProof } from "@/components/marketing/social-proof";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    {
      en: "AstraPost — AI-Powered X (Twitter) Management for MENA",
      ar: "أسترا بوست — إدارة X (تويتر) بالذكاء الاصطناعي للشرق الأوسط",
    },
    {
      en: "Schedule, generate with AI, analyze, and grow your X audience. Built for MENA creators and businesses.",
      ar: "جدول المحتوى، وأنشئ بالذكاء الاصطناعي، وحلل، ونمِّ جمهورك على X. صُمم للمبدعين والشركات في الشرق الأوسط.",
    },
    { path: "/" }
  );
}

export default async function Home() {
  const t = await getTranslations("marketing");
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="from-primary/10 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/10 to-pink-500/10 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-purple-500/10 to-transparent blur-3xl" />
        </div>

        {/* Hero copy — centered */}
        <div className="relative container mx-auto max-w-3xl space-y-8 text-center">
          <Badge variant="outline" className="px-4 py-1">
            {t("badge")}
          </Badge>

          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-r bg-clip-text pb-2 text-5xl font-bold tracking-tight text-transparent md:text-7xl">
            {t("hero_title")}
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            {t("hero_subtitle")}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Button size="lg" className="group h-12 px-8 text-lg" asChild>
              <Link href="/login">
                {t("cta_get_started")}
                <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
              <Link href="/features">{t("cta_view_features")}</Link>
            </Button>
          </div>
        </div>

        {/* Dashboard mockup — sits below the CTA buttons */}
        <HeroMockup />
      </section>

      {/* Section divider */}
      <div
        aria-hidden="true"
        className="via-border h-px bg-gradient-to-r from-transparent to-transparent"
      />

      {/* ── Social Proof ── */}
      <SocialProof />

      {/* ── Features Grid ── */}
      <section id="features" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 space-y-4 text-center">
            <Badge variant="outline">{t("features_badge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("features_title")}</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              {t("features_subtitle")}
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            <div className="bg-card rounded-xl border p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="bg-primary/10 mb-6 flex h-12 w-12 items-center justify-center rounded-lg">
                <Calendar className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t("feature_scheduling_title")}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("feature_scheduling_desc")}
              </p>
            </div>

            <div className="bg-card rounded-xl border p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="bg-primary/10 mb-6 flex h-12 w-12 items-center justify-center rounded-lg">
                <Sparkles className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t("feature_ai_writer_title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("feature_ai_writer_desc")}</p>
            </div>

            <div className="bg-card rounded-xl border p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="bg-primary/10 mb-6 flex h-12 w-12 items-center justify-center rounded-lg">
                <BarChart2 className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t("feature_analytics_title")}</h3>
              <p className="text-muted-foreground leading-relaxed">{t("feature_analytics_desc")}</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/features">
                {t("explore_all_features")}
                <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="border-border/50 from-muted/50 to-muted/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-12 text-center shadow-xl">
            <div
              aria-hidden="true"
              className="from-primary/8 absolute inset-0 bg-gradient-to-br via-purple-500/6 to-pink-500/8"
            />
            <div className="relative space-y-6">
              <div className="from-primary inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 text-white">
                <Rocket className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {t("cta_ready_title")}
                </h2>
                <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                  {t("cta_ready_subtitle")}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
                <Button size="lg" className="group h-12 px-8 text-lg" asChild>
                  <Link href="/login">
                    {t("cta_start_trial")}
                    <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                  <Link href="/pricing">{t("cta_view_pricing")}</Link>
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">{t("cta_no_credit_card")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
