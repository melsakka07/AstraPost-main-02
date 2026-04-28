import Link from "next/link";
import { Shield, Lock, Eye, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Privacy Policy", ar: "سياسة الخصوصية" },
    {
      en: "Learn how AstraPost protects your data and respects your privacy.",
      ar: "تعرف على كيفية حماية AstraPost لبياناتك واحترام خصوصيتك.",
    },
    { path: "/legal/privacy" }
  );
}

interface Section {
  number: string;
  title: string;
  content?: string;
  items?: Array<string | { label: string; description: string }>;
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  const cards = [
    {
      icon: <Shield className="text-primary h-8 w-8" />,
      title: t("privacy_card_1_title"),
      description: t("privacy_card_1_desc"),
    },
    {
      icon: <Lock className="text-primary h-8 w-8" />,
      title: t("privacy_card_2_title"),
      description: t("privacy_card_2_desc"),
    },
    {
      icon: <Eye className="text-primary h-8 w-8" />,
      title: t("privacy_card_3_title"),
      description: t("privacy_card_3_desc"),
    },
  ];

  const sections: Section[] = [
    {
      number: "1",
      title: t("privacy_section_1_title"),
      content: t("privacy_section_1_content"),
    },
    {
      number: "2",
      title: t("privacy_section_2_title"),
      content: t("privacy_section_2_content"),
      items: [
        {
          label: t("privacy_section_2_item_1_label"),
          description: t("privacy_section_2_item_1_desc"),
        },
        {
          label: t("privacy_section_2_item_2_label"),
          description: t("privacy_section_2_item_2_desc"),
        },
        {
          label: t("privacy_section_2_item_3_label"),
          description: t("privacy_section_2_item_3_desc"),
        },
        {
          label: t("privacy_section_2_item_4_label"),
          description: t("privacy_section_2_item_4_desc"),
        },
      ],
    },
    {
      number: "3",
      title: t("privacy_section_3_title"),
      items: [
        t("privacy_section_3_item_1"),
        t("privacy_section_3_item_2"),
        t("privacy_section_3_item_3"),
      ],
    },
    {
      number: "4",
      title: t("privacy_section_4_title"),
      content: t("privacy_section_4_content"),
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
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {t("privacy_badge")}
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("privacy_title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("privacy_last_updated")}</p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {cards.map((card, index) => (
            <Card key={index} className="bg-primary/5 border-none shadow-none">
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                {card.icon}
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-muted-foreground text-sm">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Sections */}
        <div className="bg-card space-y-8 rounded-2xl border p-8 shadow-sm md:p-12">
          {sections.map((section, index) => (
            <div key={index} className="space-y-4">
              <div className="bg-border h-px" />
              <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
                <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm">
                  {section.number}
                </span>
                {section.title}
              </h2>
              {section.content && (
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
              )}
              {section.items && (
                <ul
                  className={
                    typeof section.items[0] === "string"
                      ? "text-muted-foreground list-none space-y-2 pl-0"
                      : "grid list-none gap-4 pl-0 sm:grid-cols-2"
                  }
                >
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className={
                        typeof item === "string" ? "flex gap-3" : "bg-muted/50 rounded-lg p-4"
                      }
                    >
                      {typeof item === "string" ? (
                        <>
                          <div className="bg-primary mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                          {item}
                        </>
                      ) : (
                        <>
                          <strong className="text-foreground mb-1 block">{item.label}</strong>
                          <span className="text-muted-foreground text-sm">{item.description}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Contact CTA */}
          <div className="bg-muted/30 flex flex-col items-center justify-between gap-4 rounded-xl border p-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="bg-background flex h-10 w-10 items-center justify-center rounded-full border shadow-sm">
                <Mail className="text-primary h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold">{t("privacy_cta_heading")}</h4>
                <p className="text-muted-foreground text-sm">{t("privacy_cta_desc")}</p>
              </div>
            </div>
            <Button asChild>
              <Link href="mailto:privacy@astrapost.com">{t("privacy_cta_button")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
