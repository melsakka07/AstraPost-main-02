"use client";

import { useState } from "react";
import { format } from "date-fns";
import { LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImpersonationSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string | null;
  adminId: string | null;
  adminEmail: string;
  adminName: string;
}

export function ImpersonationTable({
  sessions: initialSessions,
}: {
  sessions: ImpersonationSession[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [search, setSearch] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const filteredSessions = sessions.filter(
    (s) =>
      s.targetUserEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  const handleRevoke = async (sessionId: string) => {
    if (!confirm("Are you sure you want to stop this impersonation session?")) return;

    setRevoking(sessionId);
    try {
      const res = await fetch(`/api/admin/impersonation/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to revoke session");

      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast.success("Impersonation session revoked");
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-4 border-b p-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted/50 pl-8"
          />
        </div>
      </div>

      <div className="min-h-[400px] flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target User</TableHead>
              <TableHead>Impersonated By (Admin)</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                  No active impersonation sessions found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="font-medium">{session.targetUserName || "Unknown"}</div>
                    <div className="text-muted-foreground text-sm">{session.targetUserEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{session.adminName || "Unknown Admin"}</div>
                    <div className="text-muted-foreground text-sm">{session.adminEmail}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(session.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.ipAddress || "Unknown"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revoking === session.id}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {revoking === session.id ? "Revoking..." : "Stop Impersonating"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
