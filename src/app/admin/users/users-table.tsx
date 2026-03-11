"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MoreHorizontal, 
  UserX, 
  UserCheck, 
  LogIn 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Define User type based on schema
interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  plan: string | null;
  createdAt: Date;
  isAdmin: boolean | null;
  isSuspended: boolean | null;
  lastActive?: Date; // Optional if we track activity
}

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSuspend = async (userId: string, currentStatus: boolean) => {
    setIsLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to update user status");

      toast.success(currentStatus ? "User activated" : "User suspended");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(null);
    }
  };

  const handleImpersonate = async (userId: string) => {
    setIsLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to start impersonation");

      toast.success("Impersonation started");
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error("Failed to impersonate user");
      setIsLoading(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || ""} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                {user.isAdmin ? (
                  <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">Admin</Badge>
                ) : user.isSuspended ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {user.plan || "Free"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleImpersonate(user.id)}
                      disabled={isLoading === user.id}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Impersonate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleSuspend(user.id, !!user.isSuspended)}
                      disabled={isLoading === user.id || !!user.isAdmin}
                      className={user.isSuspended ? "text-green-600" : "text-destructive"}
                    >
                      {user.isSuspended ? (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      ) : (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Suspend
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
