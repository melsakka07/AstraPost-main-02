
"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Member = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
};

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [requiresApproval, setRequiresApproval] = useState(false); // TODO: Fetch from user settings

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const res = await fetch("/api/team/members");
      if (!res.ok) throw new Error("Failed to fetch team data");
      const data = await res.json();
      setMembers(data.members);
      setInvitations(data.invitations);
    } catch (error) {
      toast.error("Failed to load team settings");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      toast.success("Invitation sent");
      setInviteEmail("");
      fetchTeamData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Member removed");
      fetchTeamData();
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel invitation");
      toast.success("Invitation cancelled");
      fetchTeamData();
    } catch (error) {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success("Role updated");
      fetchTeamData();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Team Members</h3>
        <p className="text-sm text-muted-foreground">
          Manage your team members and their roles.
        </p>
      </div>

      <div className="flex items-center space-x-2">
         <Switch 
            checked={requiresApproval} 
            onCheckedChange={(checked) => {
                setRequiresApproval(checked);
                // TODO: Save to backend
            }}
            disabled
            // Disabled until I implement the toggle API
         />
         <Label>Require approval for Editor posts (Coming Soon)</Label>
      </div>

      <div className="rounded-md border p-4">
        <h4 className="mb-4 text-sm font-medium">Invite New Member</h4>
        <form onSubmit={handleInvite} className="flex gap-4 items-end">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid w-full max-w-[180px] items-center gap-1.5">
            <Label htmlFor="role">Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image || ""} />
                    <AvatarFallback>{member.user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.user.name}</div>
                    <div className="text-xs text-muted-foreground">{member.user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={member.role}
                    onValueChange={(val) => handleRoleChange(member.id, val)}
                  >
                    <SelectTrigger className="w-[110px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Active</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {invitations.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <UserPlus className="h-4 w-4 opacity-50" />
                  </div>
                  <div>
                    <div className="font-medium">{invite.email}</div>
                    <div className="text-xs text-muted-foreground">Invitation sent</div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{invite.role}</TableCell>
                <TableCell>
                  <Badge variant="outline">Pending</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && invitations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No team members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
