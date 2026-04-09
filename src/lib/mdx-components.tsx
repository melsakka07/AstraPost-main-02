import React from "react";
import { Info, AlertTriangle, CheckCircle, Lightbulb, Zap, Star } from "lucide-react";

// Callout component for blog posts
export function Callout({
  children,
  type = "info",
  title,
}: {
  children: React.ReactNode;
  type?: "info" | "warning" | "success" | "tip" | "pro" | "note";
  title?: string;
}) {
  const styles = {
    info: {
      icon: Info,
      gradient: "from-blue-500/10 to-blue-500/5",
      border: "border-blue-500/30",
      iconBg: "bg-blue-500",
      title: title ?? "Info",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    warning: {
      icon: AlertTriangle,
      gradient: "from-amber-500/10 to-amber-500/5",
      border: "border-amber-500/30",
      iconBg: "bg-amber-500",
      title: title ?? "Warning",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    success: {
      icon: CheckCircle,
      gradient: "from-green-500/10 to-green-500/5",
      border: "border-green-500/30",
      iconBg: "bg-green-500",
      title: title ?? "Success",
      textColor: "text-green-600 dark:text-green-400",
    },
    tip: {
      icon: Lightbulb,
      gradient: "from-purple-500/10 to-purple-500/5",
      border: "border-purple-500/30",
      iconBg: "bg-purple-500",
      title: title ?? "Tip",
      textColor: "text-purple-600 dark:text-purple-400",
    },
    pro: {
      icon: Star,
      gradient: "from-pink-500/10 to-pink-500/5",
      border: "border-pink-500/30",
      iconBg: "bg-pink-500",
      title: title ?? "Pro Tip",
      textColor: "text-pink-600 dark:text-pink-400",
    },
    note: {
      icon: Zap,
      gradient: "from-cyan-500/10 to-cyan-500/5",
      border: "border-cyan-500/30",
      iconBg: "bg-cyan-500",
      title: title ?? "Note",
      textColor: "text-cyan-600 dark:text-cyan-400",
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div
      className={`my-8 rounded-xl border p-6 ${style.border} bg-gradient-to-br ${style.gradient} relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-white/5 to-transparent" />
      <div className="relative flex items-start gap-4">
        <div
          className={`h-10 w-10 rounded-lg ${style.iconBg} flex flex-shrink-0 items-center justify-center shadow-lg`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className={`mb-2 font-semibold ${style.textColor}`}>{style.title}</h4>
          <div className="text-foreground/90 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Steps component for tutorials
export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 space-y-6">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return (
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="from-primary flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 text-sm font-bold text-white shadow-md">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1 pt-1">{child}</div>
            </div>
          );
        }
        return child;
      })}
    </div>
  );
}

// Feature highlight component
export function FeatureHighlight({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: any;
}) {
  return (
    <div className="from-muted/50 to-muted/20 border-border/50 hover:border-primary/30 my-6 rounded-xl border bg-gradient-to-br p-6 transition-colors">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="from-primary/10 to-primary/5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br">
            <Icon className="text-primary h-6 w-6" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="mb-1 font-semibold">{title}</h4>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Stat card for showcasing metrics
export function StatCard({
  value,
  label,
  trend,
}: {
  value: string | number;
  label: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendStyles = {
    up: "text-green-500",
    down: "text-red-500",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="from-muted/50 to-muted/20 border-border/50 rounded-xl border bg-gradient-to-br p-6 text-center">
      <div className="from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-3xl font-bold text-transparent">
        {value}
      </div>
      <div className="text-muted-foreground mt-1 text-sm">{label}</div>
      {trend && (
        <div className={`mt-2 text-xs font-medium ${trendStyles[trend]}`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} Trending
        </div>
      )}
    </div>
  );
}

// Tweet embed simulation
export function TweetEmbed({
  author,
  username,
  content,
  date,
  likes,
  retweets,
}: {
  author: string;
  username: string;
  content: string;
  date: string;
  likes?: number;
  retweets?: number;
}) {
  return (
    <div className="border-border/50 bg-card mx-auto my-8 max-w-lg overflow-hidden rounded-2xl border shadow-lg">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="from-primary flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 font-bold text-white">
            {author.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{author}</div>
            <div className="text-muted-foreground text-sm">@{username}</div>
          </div>
        </div>
        <p className="text-base leading-relaxed">{content}</p>
        <div className="text-muted-foreground mt-3 text-sm">{date}</div>
        {(likes || retweets) && (
          <div className="border-border/50 mt-4 flex items-center gap-6 border-t pt-4">
            {likes && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>♥</span>
                <span>{likes.toLocaleString()}</span>
              </div>
            )}
            {retweets && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>🔄</span>
                <span>{retweets.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Comparison table
export function ComparisonTable({
  features,
  betterThan,
  worseThan,
}: {
  features: string[];
  betterThan?: string;
  worseThan?: string;
}) {
  return (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse overflow-hidden rounded-xl">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-6 py-4 text-left font-semibold">Feature</th>
            {betterThan && <th className="px-6 py-4 text-center font-semibold">{betterThan}</th>}
            <th className="bg-primary/10 px-6 py-4 text-center font-semibold">AstraPost</th>
            {worseThan && <th className="px-6 py-4 text-center font-semibold">{worseThan}</th>}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr
              key={index}
              className="border-border/50 hover:bg-muted/30 border-t transition-colors"
            >
              <td className="px-6 py-4 font-medium">{feature}</td>
              {betterThan && <td className="text-muted-foreground px-6 py-4 text-center">—</td>}
              <td className="px-6 py-4 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                  ✓
                </span>
              </td>
              {worseThan && <td className="text-muted-foreground px-6 py-4 text-center">—</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Inline highlight
export function InlineHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="from-primary/10 border-primary/20 text-foreground rounded-md border bg-gradient-to-r to-purple-500/10 px-2 py-1 font-medium">
      {children}
    </span>
  );
}

// Section divider
export function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="via-border h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
      {label && <span className="text-muted-foreground px-4 text-sm font-medium">{label}</span>}
      <div className="via-border h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
    </div>
  );
}

// Grid of cards
export function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

// Info card for the grid
export function InfoCard({
  title,
  description,
  icon: Icon,
  link,
}: {
  title: string;
  description: string;
  icon?: any;
  link?: string;
}) {
  const content = (
    <div className="from-muted/50 to-muted/20 border-border/50 hover:border-primary/30 group h-full cursor-pointer rounded-xl border bg-gradient-to-br p-6 transition-all hover:shadow-lg">
      {Icon && (
        <div className="from-primary/10 to-primary/5 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br transition-transform group-hover:scale-110">
          <Icon className="text-primary h-6 w-6" />
        </div>
      )}
      <h4 className="mb-2 font-semibold">{title}</h4>
      <p className="text-muted-foreground text-sm">{description}</p>
      {link && (
        <div className="text-primary mt-4 text-sm font-medium group-hover:underline">
          Learn more →
        </div>
      )}
    </div>
  );

  if (link) {
    return <a href={link}>{content}</a>;
  }

  return content;
}

// Export all components as a map for easy usage
export const mdxComponents = {
  Callout,
  Steps,
  FeatureHighlight,
  StatCard,
  TweetEmbed,
  ComparisonTable,
  InlineHighlight,
  SectionDivider,
  CardGrid,
  InfoCard,
};
