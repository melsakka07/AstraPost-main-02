import Link from "next/link";
import { Calendar, Sparkles, BarChart2, Zap, Users, Globe, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Features", ar: "الميزات" },
    {
      en: "AstraPost provides a comprehensive suite of tools to help you grow your audience, engage with your community, and monetize your content.",
      ar: "توفر AstraPost مجموعة شاملة من الأدوات لمساعدتك على تنمية جمهورك، والتفاعل مع مجتمعك، وتحقيق الدخل من محتواك.",
    },
    { path: "/features" }
  );
}

export default async function FeaturesPage() {
  const t = await getTranslations("features");

  const features = [
    {
      icon: <Calendar className="text-primary h-6 w-6" />,
      title: t("scheduling_title"),
      description: t("scheduling_desc"),
      details: [
        t("scheduling_detail_1"),
        t("scheduling_detail_2"),
        t("scheduling_detail_3"),
        t("scheduling_detail_4"),
      ],
    },
    {
      icon: <Sparkles className="text-primary h-6 w-6" />,
      title: t("ai_writer_title"),
      description: t("ai_writer_desc"),
      details: [
        t("ai_writer_detail_1"),
        t("ai_writer_detail_2"),
        t("ai_writer_detail_3"),
        t("ai_writer_detail_4"),
      ],
    },
    {
      icon: <BarChart2 className="text-primary h-6 w-6" />,
      title: t("analytics_title"),
      description: t("analytics_desc"),
      details: [
        t("analytics_detail_1"),
        t("analytics_detail_2"),
        t("analytics_detail_3"),
        t("analytics_detail_4"),
      ],
    },
    {
      icon: <Zap className="text-primary h-6 w-6" />,
      title: t("affiliate_title"),
      description: t("affiliate_desc"),
      details: [
        t("affiliate_detail_1"),
        t("affiliate_detail_2"),
        t("affiliate_detail_3"),
        t("affiliate_detail_4"),
      ],
    },
    {
      icon: <Users className="text-primary h-6 w-6" />,
      title: t("team_title"),
      description: t("team_desc"),
      details: [t("team_detail_1"), t("team_detail_2"), t("team_detail_3"), t("team_detail_4")],
    },
    {
      icon: <Globe className="text-primary h-6 w-6" />,
      title: t("crossposting_title"),
      description: t("crossposting_desc"),
      details: [
        t("crossposting_detail_1"),
        t("crossposting_detail_2"),
        t("crossposting_detail_3"),
        t("crossposting_detail_4"),
      ],
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto space-y-20 px-4 py-16 md:py-24">
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

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="bg-primary/10 mb-6 flex h-12 w-12 items-center justify-center rounded-lg">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, i) => (
                  <li key={i} className="text-muted-foreground flex items-center text-sm">
                    <div className="bg-primary mr-2 h-1.5 w-1.5 rounded-full" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="border-border/50 from-muted/50 to-muted/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center shadow-lg md:p-12">
          <div className="from-primary/8 absolute inset-0 bg-gradient-to-br via-purple-500/6 to-pink-500/8" />
          <div className="relative">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">{t("cta_title")}</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl">{t("cta_subtitle")}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="group h-11 px-8" asChild>
                <Link href="/login">
                  {t("cta_start_trial")}
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-8" asChild>
                <Link href="/pricing">{t("cta_view_pricing")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
