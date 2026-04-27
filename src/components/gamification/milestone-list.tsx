"use client";

import { Lock, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MILESTONES } from "@/lib/gamification";
import { cn } from "@/lib/utils";

function getMilestones(t: ReturnType<typeof useTranslations<"achievements">>) {
  return Object.values(MILESTONES).map((milestone) => {
    const titles: Record<string, string> = {
      first_post: t("milestones.first_post"),
      "10_posts": t("milestones.10_posts"),
      "100_followers": t("milestones.100_followers"),
      "10_day_streak": t("milestones.10_day_streak"),
    };

    const descriptions: Record<string, string> = {
      first_post: t("milestones.first_post_desc"),
      "10_posts": t("milestones.10_posts_desc"),
      "100_followers": t("milestones.100_followers_desc"),
      "10_day_streak": t("milestones.10_day_streak_desc"),
    };

    return {
      ...milestone,
      displayTitle: titles[milestone.id] ?? milestone.title,
      displayDescription: descriptions[milestone.id] ?? milestone.description,
    };
  });
}

interface MilestoneListProps {
  unlockedMilestoneIds: string[];
}

export function MilestoneList({ unlockedMilestoneIds }: MilestoneListProps) {
  const t = useTranslations("achievements");
  const milestones = getMilestones(t);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {milestones.map((milestone) => {
        const isUnlocked = unlockedMilestoneIds.includes(milestone.id);

        return (
          <Card
            key={milestone.id}
            className={cn(
              "relative overflow-hidden transition-all",
              !isUnlocked && "bg-muted/50 opacity-60 grayscale"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{milestone.displayTitle}</CardTitle>
              {isUnlocked ? (
                <span className="text-2xl">{milestone.icon}</span>
              ) : (
                <Lock className="text-muted-foreground h-4 w-4" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-xs">{milestone.displayDescription}</div>
              {isUnlocked && (
                <div className="absolute -right-4 -bottom-4 h-16 w-16 rotate-12 opacity-10">
                  <Trophy className="h-full w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
