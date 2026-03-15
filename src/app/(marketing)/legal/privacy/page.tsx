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
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Data Protection",
      description: "We use industry standard encryption to protect your data."
    },
    {
      icon: <Lock className="h-8 w-8 text-primary" />,
      title: "Secure Access",
      description: "Only you have access to your connected social accounts."
    },
    {
      icon: <Eye className="h-8 w-8 text-primary" />,
      title: "Transparency",
      description: "We are clear about what data we collect and why."
    }
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
      content: "Welcome to AstraPost (\"we,\" \"our,\" or \"us\"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you."
    },
    {
      number: "2",
      title: "Data We Collect",
      content: "We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:",
      items: [
        { label: "Identity Data", description: "First name, last name, username or similar identifier." },
        { label: "Contact Data", description: "Email address and communication preferences." },
        { label: "Technical Data", description: "IP address, login data, browser type, and time zone setting." },
        { label: "Social Media Data", description: "X (Twitter) profile info, tokens, and posted content." }
      ]
    },
    {
      number: "3",
      title: "How We Use Your Data",
      items: [
        "Where we need to perform the contract we are about to enter into or have entered into with you.",
        "Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.",
        "Where we need to comply with a legal or regulatory obligation."
      ]
    },
    {
      number: "4",
      title: "Data Security",
      content: "We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know."
    }
  ];

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <Badge variant="outline" className="px-3 py-1 text-sm">Legal</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Last updated: <time dateTime="2026-03-09">March 9, 2026</time>
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <Card key={index} className="bg-primary/5 border-none shadow-none">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                {card.icon}
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Sections */}
        <div className="bg-card border rounded-2xl p-8 md:p-12 shadow-sm space-y-8">
          {sections.map((section, index) => (
            <div key={index} className="space-y-4">
              <div className="h-px bg-border" />
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">{section.number}</span>
                {section.title}
              </h2>
              {section.content && <p className="text-muted-foreground leading-relaxed">{section.content}</p>}
              {section.items && (
                <ul className={typeof section.items[0] === 'string' ? "space-y-2 list-none pl-0 text-muted-foreground" : "grid sm:grid-cols-2 gap-4 list-none pl-0"}>
                  {section.items.map((item, i) => (
                    <li key={i} className={typeof item === 'string' ? "flex gap-3" : "bg-muted/50 p-4 rounded-lg"}>
                      {typeof item === 'string' ? (
                        <>
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                          {item}
                        </>
                      ) : (
                        <>
                          <strong className="text-foreground block mb-1">{item.label}</strong>
                          <span className="text-sm text-muted-foreground">{item.description}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Contact CTA */}
          <div className="bg-muted/30 p-6 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-background rounded-full flex items-center justify-center border shadow-sm">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Have questions?</h4>
                <p className="text-sm text-muted-foreground">Contact our privacy team</p>
              </div>
            </div>
            <Button asChild>
              <Link href="mailto:privacy@astropost.com">Email Privacy Team</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
