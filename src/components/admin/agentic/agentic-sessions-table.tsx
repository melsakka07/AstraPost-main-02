"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AgenticSessionDetail } from "./agentic-session-detail";

interface AgenticSession {
  id: string;
  topic: string;
  status: "pending" | "running" | "completed" | "failed";
  postsGenerated: number;
  qualityScore: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function AgenticSessionsTable() {
  const [sessions, setSessions] = useState<AgenticSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<AgenticSession | null>(null);

  useEffect(() => {
    fetch("/api/admin/agentic/sessions")
      .then((r) => r.json())
      .then((json) => setSessions(json.data ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = sessions.filter((session) =>
    session.topic.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return "In progress";
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const seconds = (end.getTime() - start.getTime()) / 1000;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="text-right">Quality Score</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  No agentic sessions found
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="max-w-xs truncate font-medium">{session.topic}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[session.status]}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{session.postsGenerated}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16">
                        <Progress value={session.qualityScore} className="h-2" />
                      </div>
                      <span className="text-sm font-medium">{session.qualityScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDuration(session.startedAt, session.completedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                      className="text-primary hover:text-primary/80"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedSession && (
        <AgenticSessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
