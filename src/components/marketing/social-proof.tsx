import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Jenkins",
    handle: "@sarahj_tech",
    role: "Tech Content Creator",
    content:
      "AstraPost completely changed how I manage my X account. The AI thread writer is a game changer for my productivity.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    name: "David Chen",
    handle: "@dchen_dev",
    role: "Indie Developer",
    content:
      "I used to spend hours scheduling tweets. Now I do it in 15 minutes a week. The analytics help me know exactly what works.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    name: "Amira Khalid",
    handle: "@amira_marketing",
    role: "Marketing Specialist",
    content:
      "The best tool for Arabic content creation. The multi-language support is actually usable unlike other tools.",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
  },
];

const companies = ["TechFlow", "IndieHacker", "CreatorDao", "LaunchPad", "GrowthX"];

export function SocialProof() {
  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Heading */}
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Trusted by creators worldwide
          </h2>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            Join 10,000+ creators, developers, and brands who use AstraPost to
            grow their audience.
          </p>
        </div>

        {/* Logo pills */}
        <div
          className="mb-20 grid grid-cols-2 items-center gap-4 opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:grid-cols-5"
          aria-label="Trusted by"
        >
          {companies.map((company) => (
            <div key={company} className="flex items-center justify-center">
              <span className="rounded-lg border border-border/40 bg-card px-5 py-2.5 text-base font-bold tracking-tight text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground">
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
              className="relative overflow-hidden border border-border/50 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Left accent border */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent"
              />

              <CardContent className="p-6">
                {/* Large opening quote mark */}
                <div
                  aria-hidden="true"
                  className="mb-1 font-serif text-5xl leading-none text-primary/20 select-none"
                >
                  &ldquo;
                </div>

                {/* Star rating */}
                <div className="mb-3 flex gap-0.5" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {t.content}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-border/40 pt-4">
                  <Avatar className="ring-2 ring-primary/15 ring-offset-1 ring-offset-background">
                    <AvatarImage src={t.avatar} alt={t.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-500/80 font-semibold text-white">
                      {t.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.handle}</p>
                    <p className="text-xs text-muted-foreground/60">{t.role}</p>
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
