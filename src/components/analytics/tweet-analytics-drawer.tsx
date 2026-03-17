"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, TrendingUp, Users, Heart, MessageCircle, Repeat, MousePointer, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface TweetAnalyticsDrawerProps {
  tweetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TweetAnalyticsDrawer({ tweetId, open, onOpenChange }: TweetAnalyticsDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tweetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      fetch(`/api/analytics/tweet/${tweetId}`)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load");
            return res.json();
        })
        .then((data) => setData(data))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [open, tweetId]);

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Tweet Performance</SheetTitle>
          <SheetDescription>Deep dive into your tweet's metrics.</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div role="status" aria-label="Loading analytics" className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Loading analytics...</span>
          </div>
        ) : data?.current ? (
          <div className="space-y-6 mt-6">
            {/* Score Card */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Performance Score</div>
                        <div className="text-4xl font-bold text-primary">{data.current.performanceScore || 0}/100</div>
                    </div>
                    <Activity className="h-10 w-10 text-primary/50" />
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <MetricCard icon={Users} label="Impressions" value={data.current.impressions} />
                <MetricCard icon={TrendingUp} label="Engagement Rate" value={`${data.current.engagementRate}%`} />
                <MetricCard icon={Heart} label="Likes" value={data.current.likes} />
                <MetricCard icon={Repeat} label="Retweets" value={data.current.retweets} />
                <MetricCard icon={MessageCircle} label="Replies" value={data.current.replies} />
                <MetricCard icon={MousePointer} label="Link Clicks" value={data.current.linkClicks} />
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Impressions History</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.history}>
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="fetchedAt" 
                                tickFormatter={(str) => format(new Date(str), "MMM d")}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                                labelFormatter={(label) => format(new Date(label), "MMM d, HH:mm")}
                            />
                            <Area type="monotone" dataKey="impressions" stroke="#8884d8" fillOpacity={1} fill="url(#colorImp)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            No analytics data available yet.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({ icon: Icon, label, value }: any) {
    return (
        <Card>
            <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="font-bold text-lg">{value}</div>
                </div>
            </CardContent>
        </Card>
    )
}
