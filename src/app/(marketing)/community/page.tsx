import Link from "next/link";
import {
  Users,
  MessagesSquare,
  Trophy,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactForm } from "@/components/community/contact-form";
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

const stats = [
  { label: "Members", value: "2,500+" },
  { label: "Daily Posts", value: "1,200+" },
  { label: "Threads Created", value: "50,000+" },
];

const benefits = [
  {
    icon: <MessagesSquare className="h-6 w-6" />,
    title: "Weekly Challenges",
    description: "Participate in content challenges and win prizes.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Feedback Loops",
    description: "Get honest feedback on your threads before posting.",
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: "Exclusive AMAs",
    description: "Chat with top creators and the AstraPost team.",
  },
];

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

export default function CommunityPage() {
  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 space-y-24">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline">Community</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Join the AstraPost Community
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Connect with thousands of creators, share your wins, get feedback on
              your content, and grow together.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="group" asChild>
                <Link href="https://discord.gg/astrapost">
                  Join Discord
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="https://x.com/astrapost">Follow on X</Link>
              </Button>
            </div>
          </div>

          {/* Stats card */}
          <div className="relative aspect-square md:aspect-auto rounded-2xl bg-gradient-to-tr from-primary/20 via-background to-background p-8 border shadow-lg flex items-center justify-center">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative z-10 text-center space-y-8">
              <div className="flex justify-center gap-8">
                <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-sm border">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <span className="text-2xl font-bold">{stats[0]!.value}</span>
                  <span className="text-sm text-muted-foreground">{stats[0]!.label}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-sm border">
                  <MessagesSquare className="h-8 w-8 text-primary mb-2" />
                  <span className="text-2xl font-bold">{stats[1]!.value}</span>
                  <span className="text-sm text-muted-foreground">{stats[1]!.label}</span>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-sm border w-full max-w-[200px]">
                  <Trophy className="h-8 w-8 text-primary mb-2" />
                  <span className="text-2xl font-bold">{stats[2]!.value}</span>
                  <span className="text-sm text-muted-foreground">{stats[2]!.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Benefits ───────────────────────────────────────────────────── */}
        <div className="bg-muted/30 rounded-3xl p-12 text-center max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold">Why Join?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-left space-y-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {benefit.icon}
                </div>
                <h3 className="font-semibold text-lg">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ + Contact Form ──────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              Support
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Have a question?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Check the FAQ below or send us a message — we&apos;re happy to help.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* FAQ accordion */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <MessageCircle className="h-4 w-4" />
                Frequently asked questions
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border rounded-xl px-4 data-[state=open]:shadow-sm transition-shadow"
                  >
                    <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline [&>svg]:hidden">
                      <span className="flex-1 pr-4">{faq.question}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Direct email fallback */}
              <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  For urgent issues, email us directly at{" "}
                  <a
                    href="mailto:support@astrapost.app"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    support@astrapost.app
                  </a>
                </span>
              </div>
            </div>

            {/* Contact form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <Mail className="h-4 w-4" />
                Send a message
              </div>
              <ContactForm />
            </div>
          </div>
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 md:p-12 text-center max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to join 2,500+ creators?
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Get instant access to our community of creators and start growing
              your audience today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="group" asChild>
                <Link href="https://discord.gg/astrapost">
                  Join Community Now
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">Start Creating</Link>
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
