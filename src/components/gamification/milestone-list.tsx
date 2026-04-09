import { Lock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MILESTONES } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface MilestoneListProps {
  unlockedMilestoneIds: string[];
}

export function MilestoneList({ unlockedMilestoneIds }: MilestoneListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.values(MILESTONES).map((milestone) => {
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
              <CardTitle className="text-sm font-medium">{milestone.title}</CardTitle>
              {isUnlocked ? (
                <span className="text-2xl">{milestone.icon}</span>
              ) : (
                <Lock className="text-muted-foreground h-4 w-4" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-xs">{milestone.description}</div>
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
