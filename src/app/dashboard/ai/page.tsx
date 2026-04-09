import Link from "next/link";
import { Hash, Link2, PenTool, Shuffle, Sparkles } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AiTool {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  isPro?: boolean;
}

const aiTools: AiTool[] = [
  {
    icon: PenTool,
    title: "Thread Writer",
    description: "Turn any topic into a compelling multi-tweet thread.",
    href: "/dashboard/ai/writer",
  },
  {
    icon: Link2,
    title: "URL → Thread",
    description: "Paste a URL and get an instant thread summary.",
    href: "/dashboard/ai/writer?tab=url",
  },
  {
    icon: Shuffle,
    title: "A/B Variants",
    description: "Generate multiple angles for the same tweet idea.",
    href: "/dashboard/ai/writer?tab=variants",
  },
  {
    icon: Hash,
    title: "Hashtag Generator",
    description: "Find the best hashtags for your content and niche.",
    href: "/dashboard/ai/writer?tab=hashtags",
  },
];

export default function AIHubPage() {
  return (
    <DashboardPageWrapper
      icon={Sparkles}
      title="AI Tools"
      description="Pick a tool to create, remix, and optimise your content."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {aiTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group block">
            <Card className="hover:border-primary/40 hover:bg-muted/40 h-full transition-colors">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                    <tool.icon className="text-primary h-5 w-5" />
                  </div>
                  {tool.isPro && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary h-4 px-1.5 py-0 text-[10px]"
                    >
                      Pro
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="group-hover:text-primary text-sm leading-tight font-semibold transition-colors">
                    {tool.title}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <p className="text-primary mt-auto text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  Try it →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardPageWrapper>
  );
}
