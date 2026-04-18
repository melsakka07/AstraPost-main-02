"use client";

import { format } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Team {
  id: string;
  name: string | null;
  email: string;
}

interface TeamMembership {
  id: string;
  role: string;
  joinedAt: Date;
  team: Team;
}

interface TeamMembershipProps {
  teams: TeamMembership[];
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function TeamMembershipSection({ teams }: TeamMembershipProps) {
  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === "owner") return "default";
    if (role === "admin") return "secondary";
    // "editor" and "viewer" both get outline, but are visually distinguished by label
    return "outline";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Team Memberships</CardTitle>
        <Users className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {teams.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{membership.team.name || "Unnamed Team"}</p>
                      <p className="text-muted-foreground text-xs">{membership.team.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(membership.role)}>
                      {ROLE_LABELS[membership.role] ?? membership.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(membership.joinedAt), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">No team memberships</p>
        )}
      </CardContent>
    </Card>
  );
}
