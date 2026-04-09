"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsersTableProps {
  initialUsers: any[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);

  const handleSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspend: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setUsers(users.map((u) => (u.id === userId ? { ...u, isSuspended: !currentStatus } : u)));

      toast.success(currentStatus ? "User activated" : "User suspended");
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to impersonate");

      toast.success("Impersonating user...");
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error("Impersonation failed");
    }
  };

  return (
    <div className="bg-card rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-muted-foreground text-xs">{user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    user.plan?.startsWith("pro") || user.plan === "agency" ? "default" : "secondary"
                  }
                >
                  {user.plan || "free"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isSuspended ? "destructive" : "outline"}>
                  {user.isSuspended ? "Suspended" : "Active"}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(user.createdAt), "PP")}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuspend(user.id, user.isSuspended)}
                  >
                    {user.isSuspended ? "Activate" : "Suspend"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleImpersonate(user.id)}>
                    Impersonate
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
