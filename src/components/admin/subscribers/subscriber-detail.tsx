"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  AtSign,
  Calendar,
  CreditCard,
  Globe,
  Hash,
  Monitor,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPen,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimelineSection } from "./activity-timeline-section";
import { AiUsageSection } from "./ai-usage-section";
import { BanDialog } from "./ban-dialog";
import { ConnectedAccountsHealthSection } from "./connected-accounts-health-section";
import { DeleteDialog } from "./delete-dialog";
import { EditSubscriberDialog } from "./edit-subscriber-dialog";
import { ReferralSection } from "./referral-section";
import { PlanBadge, StatusBadge, SubscriptionStatusBadge } from "./subscriber-badges";
import { TeamMembershipSection } from "./team-membership-section";
import type { SubscriberDetail, SubscriberRow } from "./types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-primary h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SubscriberDetailViewProps {
  subscriberId: string;
}

export function SubscriberDetailView({ subscriberId }: SubscriberDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [detail, setDetail] = useState<SubscriberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${subscriberId}`);
      if (!res.ok) throw new Error("Not found");
      const { data } = await res.json();
      setDetail(data);
    } catch {
      router.push("/admin/subscribers");
    } finally {
      setLoading(false);
    }
  }, [subscriberId, router]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail, pathname]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!detail) return null;

  const { subscriber: sub, subscription, connectedAccounts, usage, recentSessions } = detail;

  // Build a SubscriberRow shape for dialogs that expect it
  const subRow: SubscriberRow = {
    id: sub.id,
    name: sub.name,
    email: sub.email,
    image: sub.image,
    plan: sub.plan,
    isAdmin: sub.isAdmin,
    isSuspended: sub.isSuspended,
    bannedAt: sub.bannedAt,
    deletedAt: sub.deletedAt,
    trialEndsAt: sub.trialEndsAt,
    stripeCustomerId: sub.stripeCustomerId,
    createdAt: sub.createdAt,
    connectedPlatforms:
      connectedAccounts.x.length +
      connectedAccounts.linkedin.length +
      connectedAccounts.instagram.length,
    subscriptionStatus: subscription?.status ?? null,
  };

  const initials = sub.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back + Actions header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/subscribers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All subscribers
          </Link>
        </Button>
        {!sub.deletedAt && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <UserPen className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBanOpen(true)}
              className={
                sub.bannedAt
                  ? "text-green-600 hover:text-green-600"
                  : "text-amber-600 hover:text-amber-600"
              }
            >
              {sub.bannedAt ? (
                <ShieldCheck className="mr-2 h-4 w-4" />
              ) : (
                <ShieldOff className="mr-2 h-4 w-4" />
              )}
              {sub.bannedAt ? "Unban" : "Ban"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={sub.image ?? undefined} alt={sub.name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{sub.name}</h2>
                {sub.isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    Admin
                  </Badge>
                )}
                <PlanBadge plan={sub.plan} />
                <StatusBadge
                  isSuspended={sub.isSuspended}
                  bannedAt={sub.bannedAt}
                  deletedAt={sub.deletedAt}
                  trialEndsAt={sub.trialEndsAt}
                />
              </div>
              <p className="text-muted-foreground text-sm">{sub.email}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-0 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="pb-4 sm:pr-6 sm:pb-0">
              <DetailRow label="User ID">{sub.id}</DetailRow>
              <DetailRow label="Joined">{format(new Date(sub.createdAt), "d MMM yyyy")}</DetailRow>
              <DetailRow label="Timezone">{sub.timezone ?? "—"}</DetailRow>
              <DetailRow label="Language">{sub.language?.toUpperCase() ?? "—"}</DetailRow>
              {sub.trialEndsAt && (
                <DetailRow label="Trial ends">
                  {format(new Date(sub.trialEndsAt), "d MMM yyyy")}
                </DetailRow>
              )}
              {sub.bannedAt && (
                <DetailRow label="Banned at">
                  <span className="text-destructive">
                    {format(new Date(sub.bannedAt), "d MMM yyyy HH:mm")}
                  </span>
                </DetailRow>
              )}
            </div>
            <div className="pt-4 sm:pt-0 sm:pl-6">
              <DetailRow label="Referral code">
                {sub.referralCode ? (
                  <code className="font-mono text-xs">{sub.referralCode}</code>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Stripe customer">
                {sub.stripeCustomerId ? (
                  <code className="font-mono text-xs">{sub.stripeCustomerId}</code>
                ) : (
                  "—"
                )}
              </DetailRow>
              {subscription && (
                <>
                  <DetailRow label="Subscription status">
                    <SubscriptionStatusBadge status={subscription.status} />
                  </DetailRow>
                  {subscription.currentPeriodEnd && (
                    <DetailRow label="Renews / expires">
                      {format(new Date(subscription.currentPeriodEnd), "d MMM yyyy")}
                    </DetailRow>
                  )}
                  {subscription.cancelAtPeriodEnd && (
                    <DetailRow label="">
                      <Badge variant="outline" className="text-amber-600">
                        Cancels at period end
                      </Badge>
                    </DetailRow>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total posts" value={usage.totalPosts} icon={Calendar} />
        <StatCard label="Published" value={usage.publishedPosts} icon={Globe} />
        <StatCard label="Drafts" value={usage.drafts} icon={Hash} />
        <StatCard label="AI this month" value={usage.aiGenerationsThisMonth} icon={Zap} />
      </div>

      {/* Enhanced sections grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* AI Usage Section */}
        {detail.aiQuota && detail.imageQuota && (
          <AiUsageSection
            quota={detail.aiQuota}
            imageQuota={detail.imageQuota}
            plan={sub.plan ?? "free"}
          />
        )}

        {/* Referrals Section */}
        {detail.referrals && (
          <ReferralSection
            referralCode={sub.referralCode ?? null}
            referredUsers={detail.referrals.referredUsers.map((item) => ({
              ...item,
              createdAt: new Date(item.createdAt),
            }))}
            referralCredits={detail.referrals.creditsEarned}
            referralCount={detail.referrals.totalCount}
          />
        )}

        {/* Team Memberships Section */}
        {detail.teamMemberships && detail.teamMemberships.length > 0 && (
          <TeamMembershipSection
            teams={detail.teamMemberships.map((membership) => ({
              ...membership,
              joinedAt: new Date(membership.joinedAt),
            }))}
          />
        )}

        {/* Connected Accounts Health Section */}
        {(connectedAccounts.x.length > 0 ||
          connectedAccounts.linkedin.length > 0 ||
          connectedAccounts.instagram.length > 0) && (
          <ConnectedAccountsHealthSection
            accounts={[
              ...connectedAccounts.x.map((acc) => ({
                id: acc.id,
                username: acc.xUsername,
                tokenExpiry: acc.tokenExpiry ? new Date(acc.tokenExpiry) : null,
                isHealthy: acc.isHealthy ?? true,
              })),
              ...connectedAccounts.linkedin.map((acc) => ({
                id: acc.id,
                username: acc.linkedinName || "unknown",
                tokenExpiry: acc.tokenExpiry ? new Date(acc.tokenExpiry) : null,
                isHealthy: acc.isHealthy ?? true,
              })),
              ...connectedAccounts.instagram.map((acc) => ({
                id: acc.id,
                username: acc.instagramUsername,
                tokenExpiry: acc.tokenExpiry ? new Date(acc.tokenExpiry) : null,
                isHealthy: acc.isHealthy ?? true,
              })),
            ]}
          />
        )}
      </div>

      {/* Activity Timeline Section - Full Width */}
      {detail.recentActivity && detail.recentActivity.length > 0 && (
        <ActivityTimelineSection
          activities={detail.recentActivity.map((activity) => ({
            ...activity,
            createdAt: new Date(activity.createdAt),
          }))}
        />
      )}

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions found</p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-start gap-3 rounded-md border p-2.5">
                  <Monitor className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground truncate text-xs">
                      {s.userAgent ?? "Unknown device"}
                    </p>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                      <span>
                        <AtSign className="mr-0.5 inline h-3 w-3" />
                        {s.ipAddress ?? "—"}
                      </span>
                      <span>
                        <CreditCard className="mr-0.5 inline h-3 w-3" />
                        {format(new Date(s.createdAt), "d MMM yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                  {new Date(s.expiresAt) < new Date() && (
                    <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
                      Expired
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions found</p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-start gap-3 rounded-md border p-2.5">
                  <Monitor className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground truncate text-xs">
                      {s.userAgent ?? "Unknown device"}
                    </p>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                      <span>
                        <AtSign className="mr-0.5 inline h-3 w-3" />
                        {s.ipAddress ?? "—"}
                      </span>
                      <span>
                        <CreditCard className="mr-0.5 inline h-3 w-3" />
                        {format(new Date(s.createdAt), "d MMM yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                  {new Date(s.expiresAt) < new Date() && (
                    <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
                      Expired
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditSubscriberDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        subscriber={subRow}
        onSuccess={fetchDetail}
      />
      <BanDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        subscriberId={sub.id}
        subscriberName={sub.name}
        isBanned={!!sub.bannedAt}
        onSuccess={fetchDetail}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        subscriberId={sub.id}
        subscriberName={sub.name}
        onSuccess={() => router.push("/admin/subscribers")}
      />
    </div>
  );
}
