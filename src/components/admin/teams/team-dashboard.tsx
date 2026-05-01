"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminPolling } from "../use-admin-polling";

interface TeamRow {
  teamId: string;
  owner: string;
  ownerEmail: string;
  plan: string;
  memberCount: number;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  teamOwner: string;
  teamOwnerEmail: string;
  expiresAt: string;
  createdAt: string;
  status: string;
}

interface SummaryStats {
  totalTeams: number;
  totalMembers: number;
  pendingInvitations: number;
  expiredInvitations: number;
}

interface TeamsResponse {
  summary: SummaryStats;
  teams: {
    data: TeamRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  invitations: {
    data: InvitationRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    free: "secondary",
    pro_monthly: "default",
    pro_annual: "default",
    agency: "outline",
  };
  const labels: Record<string, string> = {
    free: "Free",
    pro_monthly: "Pro Monthly",
    pro_annual: "Pro Annual",
    agency: "Agency",
  };
  return <Badge variant={variants[plan] ?? "secondary"}>{labels[plan] ?? plan}</Badge>;
}

function InvitationStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    pending: "default",
    accepted: "secondary",
    expired: "outline",
    revoked: "destructive",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

interface TeamDashboardProps {
  initialData?: TeamsResponse | null;
}

export function TeamDashboard({ initialData }: TeamDashboardProps = {}) {
  const [activeTab, setActiveTab] = useState<"teams" | "invitations">("teams");
  const [teamsPage, setTeamsPage] = useState(1);
  const [invitationsPage, setInvitationsPage] = useState(1);

  const currentPage = activeTab === "teams" ? teamsPage : invitationsPage;

  const { data, loading } = useAdminPolling<TeamsResponse>({
    fetchFn: async (signal) => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "10",
        tab: activeTab,
      });
      const res = await fetch(`/api/admin/teams?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch team data");
      const json: TeamsResponse = await res.json();
      return json;
    },
    intervalMs: 60_000,
    onError: () => {
      toast.error("Failed to load team data");
    },
    ...(initialData !== undefined && { initialData }),
  });

  const handleTabChange = (value: string) => {
    const newTab = value as "teams" | "invitations";
    setActiveTab(newTab);
    if (newTab === "teams") setTeamsPage(1);
    else setInvitationsPage(1);
  };

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return null;

  const { summary, teams, invitations } = data;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Teams" value={summary.totalTeams.toLocaleString()} icon={Users} />
          <StatCard
            title="Total Members"
            value={summary.totalMembers.toLocaleString()}
            description="Across all teams"
            icon={Users}
          />
          <StatCard
            title="Pending Invitations"
            value={summary.pendingInvitations}
            description="Awaiting acceptance"
            icon={UserPlus}
            variant={summary.pendingInvitations > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Expired Invitations"
            value={summary.expiredInvitations}
            description="Not accepted in time"
            icon={Clock}
            variant={summary.expiredInvitations > 0 ? "destructive" : "default"}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} suppressHydrationWarning>
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {summary.pendingInvitations > 0 && (
              <Badge variant="secondary" className="ml-2">
                {summary.pendingInvitations}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Owner
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Email
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                    Members
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Plan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : teams.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground h-32 text-center">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.data.map((team) => (
                    <TableRow key={team.teamId}>
                      <TableCell className="font-medium">{team.owner}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {team.ownerEmail}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {team.memberCount}
                      </TableCell>
                      <TableCell>
                        <PlanBadge plan={team.plan} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Teams Pagination */}
          {teams.pagination.totalPages > 1 && (
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>
                {(teams.pagination.page - 1) * teams.pagination.limit + 1}–
                {Math.min(teams.pagination.page * teams.pagination.limit, teams.pagination.total)}{" "}
                of {teams.pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="border-input hover:bg-accent hover:text-accent-foreground bg-background inline-flex h-8 w-8 items-center justify-center rounded-md border p-0 disabled:pointer-events-none disabled:opacity-50"
                  disabled={teams.pagination.page <= 1}
                  onClick={() => setTeamsPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                </button>
                <span className="px-2">
                  {teams.pagination.page} / {teams.pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="border-input hover:bg-accent hover:text-accent-foreground bg-background inline-flex h-8 w-8 items-center justify-center rounded-md border p-0 disabled:pointer-events-none disabled:opacity-50"
                  disabled={teams.pagination.page >= teams.pagination.totalPages}
                  onClick={() => setTeamsPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Email
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Role
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Team Owner
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Expires At
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Created At
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invitations.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      No invitations found
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.data.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{inv.teamOwner}</span>
                          <span className="text-muted-foreground text-xs">
                            {inv.teamOwnerEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(inv.expiresAt), "d MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(inv.createdAt), "d MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <InvitationStatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Invitations Pagination */}
          {invitations.pagination.totalPages > 1 && (
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>
                {(invitations.pagination.page - 1) * invitations.pagination.limit + 1}–
                {Math.min(
                  invitations.pagination.page * invitations.pagination.limit,
                  invitations.pagination.total
                )}{" "}
                of {invitations.pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="border-input hover:bg-accent hover:text-accent-foreground bg-background inline-flex h-8 w-8 items-center justify-center rounded-md border p-0 disabled:pointer-events-none disabled:opacity-50"
                  disabled={invitations.pagination.page <= 1}
                  onClick={() => setInvitationsPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                </button>
                <span className="px-2">
                  {invitations.pagination.page} / {invitations.pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="border-input hover:bg-accent hover:text-accent-foreground bg-background inline-flex h-8 w-8 items-center justify-center rounded-md border p-0 disabled:pointer-events-none disabled:opacity-50"
                  disabled={invitations.pagination.page >= invitations.pagination.totalPages}
                  onClick={() => setInvitationsPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
