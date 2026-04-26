"use client";

import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { FileText, Sparkles, CreditCard } from "lucide-react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityType = "post" | "ai_generation" | "plan_change";

interface Activity {
  type: ActivityType;
  id: string;
  createdAt: Date;
  status?: string;
  prompt?: string;
  oldPlan?: string;
  newPlan?: string;
  reason?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimelineSection({ activities }: ActivityTimelineProps) {
  const locale = useLocale();
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "post":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "ai_generation":
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case "plan_change":
        return <CreditCard className="h-4 w-4 text-green-500" />;
    }
  };

  const getActivityTitle = (activity: Activity) => {
    switch (activity.type) {
      case "post":
        return "Post Created";
      case "ai_generation":
        return `AI Generated: ${activity.prompt || "Content"}`;
      case "plan_change":
        return `Plan Changed: ${activity.oldPlan} → ${activity.newPlan}`;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "default";
      case "scheduled":
        return "secondary";
      case "draft":
        return "outline";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        <FileText className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {sortedActivities.length > 0 ? (
          <div className="space-y-4">
            {sortedActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="bg-background rounded-full border p-1.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="bg-border h-full min-h-[2rem] w-px" />
                </div>
                <div className="flex-1 space-y-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-sm font-medium">{getActivityTitle(activity)}</p>
                    {activity.status && activity.type === "post" && (
                      <Badge variant={getStatusBadgeVariant(activity.status)} className="shrink-0">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  {activity.reason && activity.type === "plan_change" && (
                    <p className="text-muted-foreground text-xs">{activity.reason}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                      locale: locale === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">No recent activity</p>
        )}
      </CardContent>
    </Card>
  );
}
