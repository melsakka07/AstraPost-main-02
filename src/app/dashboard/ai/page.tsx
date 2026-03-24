import Link from "next/link";
import {
  Hash,
  Link2,
  PenTool,
  Shuffle,
  Sparkles,
} from "lucide-react";
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
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  {tool.isPro && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary"
                    >
                      Pro
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                    {tool.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <p className="mt-auto text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
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
