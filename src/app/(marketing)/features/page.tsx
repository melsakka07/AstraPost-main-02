import { Calendar, Sparkles, BarChart2, Zap, Users, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FeaturesPage() {
  const features = [
    {
      icon: <Calendar className="h-6 w-6 text-primary" />,
      title: "Smart Scheduling",
      description: "Plan your content weeks in advance. Drag and drop calendar view makes it easy to visualize your strategy.",
      details: [
        "Visual calendar view",
        "Best time to post recommendations",
        "Drag & drop rescheduling",
        "Timezone management"
      ]
    },
    {
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      title: "AI Writer",
      description: "Generate viral threads, hook ideas, and polished tweets in seconds using our advanced AI models.",
      details: [
        "Thread generation from topics",
        "Tone adjustment",
        "Hashtag suggestions",
        "Content rephrasing"
      ]
    },
    {
      icon: <BarChart2 className="h-6 w-6 text-primary" />,
      title: "Deep Analytics",
      description: "Understand what works. Track impressions, engagement rates, and follower growth over time.",
      details: [
        "Engagement metrics",
        "Follower growth tracking",
        "Top performing posts",
        "Exportable reports"
      ]
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: "Affiliate Generator",
      description: "Turn product links into high-converting tweets automatically.",
      details: [
        "Amazon & generic link support",
        "Automatic metadata extraction",
        "Conversion-optimized copy",
        "Affiliate tag insertion"
      ]
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Team Collaboration",
      description: "Work together with your team. Assign roles and manage multiple accounts.",
      details: [
        "Multi-user access",
        "Approval workflows",
        "Shared media library",
        "Activity logs"
      ]
    },
    {
      icon: <Globe className="h-6 w-6 text-primary" />,
      title: "Cross-Posting",
      description: "Sync your content across platforms (Coming Soon).",
      details: [
        "LinkedIn integration",
        "Threads integration",
        "Customizable formats per platform",
        "Unified inbox"
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 space-y-20">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="outline" className="px-4 py-1">Features</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need to master X</h1>
        <p className="text-xl text-muted-foreground">
          AstroPost provides a comprehensive suite of tools to help you grow your audience, engage with your community, and monetize your content.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="bg-card border rounded-xl p-8 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-muted-foreground mb-6">{feature.description}</p>
            <ul className="space-y-2">
              {feature.details.map((detail, i) => (
                <li key={i} className="flex items-center text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mr-2" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
