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
    <div className={`my-8 p-6 rounded-xl border ${style.border} bg-gradient-to-br ${style.gradient} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="flex items-start gap-4 relative">
        <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold mb-2 ${style.textColor}`}>{style.title}</h4>
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
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
    <div className="my-6 p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
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
    <div className="p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 text-center">
      <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
      {trend && (
        <div className={`text-xs font-medium mt-2 ${trendStyles[trend]}`}>
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
    <div className="my-8 max-w-lg mx-auto rounded-2xl border border-border/50 overflow-hidden bg-card shadow-lg">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
            {author.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{author}</div>
            <div className="text-sm text-muted-foreground">@{username}</div>
          </div>
        </div>
        <p className="text-base leading-relaxed">{content}</p>
        <div className="text-sm text-muted-foreground mt-3">{date}</div>
        {(likes || retweets) && (
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
            {likes && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>♥</span>
                <span>{likes.toLocaleString()}</span>
              </div>
            )}
            {retweets && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
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
      <table className="w-full border-collapse rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-6 py-4 text-left font-semibold">Feature</th>
            {betterThan && <th className="px-6 py-4 text-center font-semibold">{betterThan}</th>}
            <th className="px-6 py-4 text-center font-semibold bg-primary/10">AstraPost</th>
            {worseThan && <th className="px-6 py-4 text-center font-semibold">{worseThan}</th>}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={index} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
              <td className="px-6 py-4 font-medium">{feature}</td>
              {betterThan && (
                <td className="px-6 py-4 text-center text-muted-foreground">—</td>
              )}
              <td className="px-6 py-4 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs">
                  ✓
                </span>
              </td>
              {worseThan && (
                <td className="px-6 py-4 text-center text-muted-foreground">—</td>
              )}
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
    <span className="px-2 py-1 rounded-md bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-foreground font-medium">
      {children}
    </span>
  );
}

// Section divider
export function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      {label && (
        <span className="text-sm font-medium text-muted-foreground px-4">{label}</span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

// Grid of cards
export function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
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
    <div className="p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg group cursor-pointer h-full">
      {Icon && (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      )}
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
      {link && (
        <div className="text-sm text-primary mt-4 font-medium group-hover:underline">
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
