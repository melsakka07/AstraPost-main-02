import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Users,
  MessagesSquare,
  Trophy,
  HelpCircle,
  ChevronDown,
  Mail,
  MessageCircle,
} from "lucide-react";
import { ContactForm } from "@/components/community/contact-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community & Support",
  description:
    "Connect with thousands of creators, get help from our support team, and grow together with AstraPost.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "Community & Support — AstraPost",
    description:
      "Connect with thousands of creators, get help from our support team, and grow together with AstraPost.",
    url: "/community",
  },
};

const faqs = [
  {
    question: "How do I join the AstraPost Discord community?",
    answer:
      'Click the "Join Discord" button on this page. Once inside, introduce yourself in #introductions and head to #content-feedback to start sharing your work. All plans get free community access.',
  },
  {
    question: "How do I get feedback on my threads before posting?",
    answer:
      "Share your draft in the #feedback-lounge channel on Discord. Tag it with your niche (e.g. #tech, #finance, #arabic-content) for targeted responses. Pro and Agency users also get access to dedicated review channels.",
  },
  {
    question: "Is there a regular challenge or contest schedule?",
    answer:
      "Yes — every Monday we post a weekly content challenge in #weekly-challenge. Winners are announced on Fridays and featured in our newsletter. Prizes range from plan upgrades to sponsored shoutouts.",
  },
  {
    question: "Who should I contact for partnership or business inquiries?",
    answer:
      'Use the contact form below and select "Partnership / Business" as the category. Our partnerships team reviews all submissions and responds within 2 business days.',
  },
  {
    question: "How often are the Creator AMAs held?",
    answer:
      "We host at least one AMA per month, featuring a top creator or a member of the AstraPost team. Upcoming AMAs are announced in #announcements on Discord and on our roadmap page.",
  },
  {
    question: "I found a bug. What's the fastest way to report it?",
    answer:
      'Use the contact form below and select "Bug Report". Include your browser, the page URL, and steps to reproduce. For critical issues (e.g. posts not publishing), email us directly at support@astrapost.app.',
  },
];

export default async function CommunityPage() {
  const t = await getTranslations("community");

  const translatedStats = [
    { label: t("stats_members"), value: "2,500+" },
    { label: t("stats_daily_posts"), value: "1,200+" },
    { label: t("stats_threads_created"), value: "50,000+" },
  ];

  const benefits = [
    {
      icon: <MessagesSquare className="h-6 w-6" />,
      title: t("benefit_challenges_title"),
      description: t("benefit_challenges_desc"),
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: t("benefit_feedback_title"),
      description: t("benefit_feedback_desc"),
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: t("benefit_amas_title"),
      description: t("benefit_amas_desc"),
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto space-y-24 px-4 py-16 md:py-24">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <Badge variant="outline">{t("badge")}</Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("hero_title")}</h1>
            <p className="text-muted-foreground text-xl leading-relaxed">{t("hero_subtitle")}</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" disabled>
                {t("join_discord")}
                <Badge variant="secondary" className="ml-2 h-4 px-1.5 py-0 text-[10px]">
                  {t("coming_soon")}
                </Badge>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="https://x.com/astrapostai" target="_blank" rel="noopener noreferrer">
                  {t("follow_on_x")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats card */}
          <div className="from-primary/20 via-background to-background relative flex aspect-square items-center justify-center rounded-2xl border bg-gradient-to-tr p-8 shadow-lg md:aspect-auto">
            <div className="bg-grid-white/10 absolute inset-0 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative z-10 space-y-8 text-center">
              <div className="flex justify-center gap-8">
                <div className="bg-background flex flex-col items-center rounded-lg border p-4 shadow-sm">
                  <Users className="text-primary mb-2 h-8 w-8" />
                  <span className="text-2xl font-bold">{translatedStats[0]!.value}</span>
                  <span className="text-muted-foreground text-sm">{translatedStats[0]!.label}</span>
                </div>
                <div className="bg-background flex flex-col items-center rounded-lg border p-4 shadow-sm">
                  <MessagesSquare className="text-primary mb-2 h-8 w-8" />
                  <span className="text-2xl font-bold">{translatedStats[1]!.value}</span>
                  <span className="text-muted-foreground text-sm">{translatedStats[1]!.label}</span>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-background flex w-full max-w-[200px] flex-col items-center rounded-lg border p-4 shadow-sm">
                  <Trophy className="text-primary mb-2 h-8 w-8" />
                  <span className="text-2xl font-bold">{translatedStats[2]!.value}</span>
                  <span className="text-muted-foreground text-sm">{translatedStats[2]!.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Benefits ───────────────────────────────────────────────────── */}
        <div className="bg-muted/30 mx-auto max-w-4xl space-y-8 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold">{t("why_join_title")}</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="space-y-3 text-left">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ + Contact Form ──────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-3 text-center">
            <Badge variant="outline" className="gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              {t("support_badge")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("faq_title")}</h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg">{t("faq_subtitle")}</p>
          </div>

          <div className="grid items-start gap-10 lg:grid-cols-2">
            {/* FAQ accordion */}
            <div className="space-y-4">
              <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
                <MessageCircle className="h-4 w-4" />
                {t("faq_heading")}
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="rounded-xl border px-4 transition-shadow data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-medium hover:no-underline [&>svg]:hidden">
                      <span className="flex-1 pr-4">{faq.question}</span>
                      <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 text-sm leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Direct email fallback */}
              <div className="text-muted-foreground flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t("urgent_email_prefix")}{" "}
                  <a
                    href="mailto:support@astrapost.app"
                    className="text-foreground hover:text-primary font-medium underline underline-offset-4"
                  >
                    support@astrapost.app
                  </a>
                </span>
              </div>
            </div>

            {/* Contact form */}
            <div className="space-y-4">
              <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
                <Mail className="h-4 w-4" />
                {t("contact_heading")}
              </div>
              <ContactForm />
            </div>
          </div>
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="border-border/50 from-muted/50 to-muted/20 relative mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center md:p-12">
          <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h3 className="mb-4 text-2xl font-bold md:text-3xl">{t("cta_title")}</h3>
            <p className="text-muted-foreground mx-auto mb-8 max-w-lg">{t("cta_subtitle")}</p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" disabled>
                {t("cta_join")}
                <Badge variant="secondary" className="ml-2 h-4 px-1.5 py-0 text-[10px]">
                  {t("coming_soon")}
                </Badge>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">{t("cta_start_creating")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
