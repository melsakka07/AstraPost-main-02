import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Jenkins",
    handle: "@sarahj_tech",
    content: "AstroPost completely changed how I manage my X account. The AI thread writer is a game changer for my productivity.",
    role: "Tech Content Creator",
    avatar: "/avatars/sarah.jpg"
  },
  {
    name: "David Chen",
    handle: "@dchen_dev",
    content: "I used to spend hours scheduling tweets. Now I do it in 15 minutes a week. The analytics help me know exactly what works.",
    role: "Indie Developer",
    avatar: "/avatars/david.jpg"
  },
  {
    name: "Amira Khalid",
    handle: "@amira_marketing",
    content: "The best tool for Arabic content creation. The multi-language support is actually usable unlike other tools.",
    role: "Marketing Specialist",
    avatar: "/avatars/amira.jpg"
  }
];

const companies = [
  "TechFlow", "IndieHacker", "CreatorDao", "LaunchPad", "GrowthX"
];

export function SocialProof() {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Trusted by creators worldwide
          </h2>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            Join 10,000+ creators, developers, and brands who use AstroPost to grow their audience.
          </p>
        </div>

        {/* Logos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-center opacity-50 mb-20 grayscale hover:grayscale-0 transition-all duration-500">
          {companies.map((company, i) => (
            <div key={i} className="flex items-center justify-center font-bold text-xl">
              {company}
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid gap-6 md:grid-cols-3 lg:gap-12">
          {testimonials.map((t, i) => (
            <Card key={i} className="bg-muted/50 border-none shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-4 pt-4">
                  <Avatar>
                    <AvatarImage src={t.avatar} />
                    <AvatarFallback>{t.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-muted-foreground">{t.handle}</p>
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
