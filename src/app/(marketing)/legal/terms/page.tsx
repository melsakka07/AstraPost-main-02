import Link from "next/link";
import { Scale, FileCheck, ShieldAlert, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read AstroPost's terms of service and understand your rights and obligations.",
  alternates: { canonical: "/legal/terms" },
  openGraph: {
    title: "Terms of Service — AstroPost",
    description: "Read AstroPost's terms of service and understand your rights and obligations.",
    url: "/legal/terms",
  },
};

export default function TermsPage() {
  const cards = [
    {
      icon: <Scale className="h-8 w-8 text-primary" />,
      title: "Fair Usage",
      description: "Guidelines for using our platform responsibly."
    },
    {
      icon: <FileCheck className="h-8 w-8 text-primary" />,
      title: "Content Rights",
      description: "You own your content, we just help you post it."
    },
    {
      icon: <ShieldAlert className="h-8 w-8 text-primary" />,
      title: "Limitations",
      description: "Our liability and service warranties explained."
    }
  ];

  const sections = [
    {
      number: "1",
      title: "Introduction",
      content: "These Terms of Service (\"Terms\") govern your access to and use of AstroPost's website, products, and services (\"Services\"). Please read these Terms carefully, and contact us if you have any questions. By accessing or using our Services, you agree to be bound by these Terms and by our Privacy Policy."
    },
    {
      number: "2",
      title: "Use of Services",
      content: "You may use our Services only if you can form a binding contract with AstroPost, and only in compliance with these Terms and all applicable local, state, national, and international laws, rules, and regulations."
    },
    {
      number: "3",
      title: "Your Content",
      content: "You retain your rights to any content you submit, post or display on or through the Services. By submitting, posting or displaying content on or through the Services, you grant us a worldwide, non-exclusive, royalty-free license (with the right to sublicense) to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such content in any and all media or distribution methods (now known or later developed)."
    },
    {
      number: "4",
      title: "AstroPost Rights",
      content: "All right, title, and interest in and to the Services (excluding Content provided by users) are and will remain the exclusive property of AstroPost and its licensors. The Services are protected by copyright, trademark, and other laws of both the United States and foreign countries."
    },
    {
      number: "5",
      title: "Restrictions",
      items: [
        "Access, tamper with, or use non-public areas of the Services, AstroPost's computer systems, or the technical delivery systems of AstroPost's providers.",
        "Probe, scan, or test the vulnerability of any system or network or breach or circumvent any security or authentication measures.",
        "Access or search or attempt to access or search the Services by any means (automated or otherwise) other than through our currently available, published interfaces that are provided by AstroPost.",
        "Interfere with, or disrupt, (or attempt to do so), the access of any user, host or network, including, without limitation, sending a virus, overloading, flooding, spamming, mail-bombing the Services."
      ]
    },
    {
      number: "6",
      title: "Termination",
      content: "We may suspend or terminate your access to and use of the Services, at our sole discretion, at any time and without notice to you. Upon any termination, discontinuation or cancellation of Services or your Account, the following provisions will survive: ownership provisions, warranty disclaimers, limitations of liability, and dispute resolution provisions."
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
            Terms of Service
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
                <ul className="space-y-2 list-none pl-0 text-muted-foreground">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                      {item}
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
                <p className="text-sm text-muted-foreground">Contact our legal team</p>
              </div>
            </div>
            <Button asChild>
              <Link href="mailto:terms@astropost.com">Email Legal Team</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
