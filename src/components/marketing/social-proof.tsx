"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const companies = ["TechFlow", "IndieHacker", "CreatorDao", "LaunchPad", "GrowthX"];

export function SocialProof() {
  const t = useTranslations("marketing");

  const testimonials = [
    {
      name: t("testimonial_1_name"),
      handle: t("testimonial_1_handle"),
      role: t("testimonial_1_role"),
      content: t("testimonial_1_quote"),
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    {
      name: t("testimonial_2_name"),
      handle: t("testimonial_2_handle"),
      role: t("testimonial_2_role"),
      content: t("testimonial_2_quote"),
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    {
      name: t("testimonial_3_name"),
      handle: t("testimonial_3_handle"),
      role: t("testimonial_3_role"),
      content: t("testimonial_3_quote"),
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
    },
  ];

  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Heading */}
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            {t("social_proof_title")}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-[700px] md:text-xl">
            {t("social_proof_subtitle")}
          </p>
        </div>

        {/* Logo pills */}
        <div
          className="mb-20 grid grid-cols-2 items-center gap-4 opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:grid-cols-5"
          aria-label={t("companies_label")}
        >
          {companies.map((company) => (
            <div key={company} className="flex items-center justify-center">
              <span className="border-border/40 bg-card text-muted-foreground hover:border-border hover:text-foreground rounded-lg border px-5 py-2.5 text-base font-bold tracking-tight transition-colors duration-200">
                {company}
              </span>
            </div>
          ))}
        </div>

        {/* Testimonial cards */}
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {testimonials.map((t) => (
            <Card
              key={t.handle}
              className="border-border/50 bg-card relative overflow-hidden border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Left accent border */}
              <div
                aria-hidden="true"
                className="from-primary/60 via-primary/30 absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b to-transparent"
              />

              <CardContent className="p-6">
                {/* Large opening quote mark */}
                <div
                  aria-hidden="true"
                  className="text-primary/20 mb-1 font-serif text-5xl leading-none select-none"
                >
                  &ldquo;
                </div>

                {/* Star rating */}
                <div className="mb-3 flex gap-0.5" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground mb-6 leading-relaxed">{t.content}</p>

                {/* Author */}
                <div className="border-border/40 flex items-center gap-3 border-t pt-4">
                  <Avatar className="ring-primary/15 ring-offset-background ring-2 ring-offset-1">
                    <AvatarImage src={t.avatar} alt={t.name} />
                    <AvatarFallback className="from-primary/80 bg-gradient-to-br to-purple-500/80 font-semibold text-white">
                      {t.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-foreground text-sm font-semibold">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.handle}</p>
                    <p className="text-muted-foreground/60 text-xs">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
