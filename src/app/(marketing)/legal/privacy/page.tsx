import Link from "next/link";
import { Shield, Lock, Eye, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how AstraPost protects your data and respects your privacy.",
  alternates: { canonical: "/legal/privacy" },
  openGraph: {
    title: "Privacy Policy — AstraPost",
    description: "Learn how AstraPost protects your data and respects your privacy.",
    url: "/legal/privacy",
  },
};

export default function PrivacyPage() {
  const cards = [
    {
      icon: <Shield className="text-primary h-8 w-8" />,
      title: "Data Protection",
      description: "We use industry standard encryption to protect your data.",
    },
    {
      icon: <Lock className="text-primary h-8 w-8" />,
      title: "Secure Access",
      description: "Only you have access to your connected social accounts.",
    },
    {
      icon: <Eye className="text-primary h-8 w-8" />,
      title: "Transparency",
      description: "We are clear about what data we collect and why.",
    },
  ];

  interface Section {
    number: string;
    title: string;
    content?: string;
    items?: Array<string | { label: string; description: string }>;
  }

  const sections: Section[] = [
    {
      number: "1",
      title: "Introduction",
      content:
        'Welcome to AstraPost ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.',
    },
    {
      number: "2",
      title: "Data We Collect",
      content:
        "We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:",
      items: [
        {
          label: "Identity Data",
          description: "First name, last name, username or similar identifier.",
        },
        { label: "Contact Data", description: "Email address and communication preferences." },
        {
          label: "Technical Data",
          description: "IP address, login data, browser type, and time zone setting.",
        },
        {
          label: "Social Media Data",
          description: "X (Twitter) profile info, tokens, and posted content.",
        },
      ],
    },
    {
      number: "3",
      title: "How We Use Your Data",
      items: [
        "Where we need to perform the contract we are about to enter into or have entered into with you.",
        "Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.",
        "Where we need to comply with a legal or regulatory obligation.",
      ],
    },
    {
      number: "4",
      title: "Data Security",
      content:
        "We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.",
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
            Legal
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Last updated: <time dateTime="2026-03-09">March 9, 2026</time>
          </p>
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
                <h4 className="font-semibold">Have questions?</h4>
                <p className="text-muted-foreground text-sm">Contact our privacy team</p>
              </div>
            </div>
            <Button asChild>
              <Link href="mailto:privacy@astrapost.com">Email Privacy Team</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
