"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  pending: "bg-warning-9/10 text-warning-11 dark:text-warning-11",
  running: "bg-info-9/10 text-info-11 dark:text-info-11",
  completed: "bg-success-9/10 text-success-11 dark:text-success-11",
  failed: "bg-danger-9/10 text-danger-11 dark:text-danger-11",
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

interface AgenticSessionsTableProps {
  initialData?: AgenticSession[];
}

export function AgenticSessionsTable({ initialData }: AgenticSessionsTableProps) {
  const [sessions, setSessions] = useState<AgenticSession[]>(initialData ?? []);
  const [loading, setLoading] = useState(initialData === null);
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<AgenticSession | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);

    fetch("/api/admin/agentic/sessions", { signal: abortController.signal })
      .then((r) => r.json())
      .then((json) => setSessions(json.data ?? []))
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setSessions([]);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [pathname]);

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
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Topic
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Status
              </TableHead>
              <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                Posts
              </TableHead>
              <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                Quality Score
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Duration
              </TableHead>
              <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                Action
              </TableHead>
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
