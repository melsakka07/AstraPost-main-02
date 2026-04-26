"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal, Trash2, Loader2, UserX, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
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
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: Date;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
};

interface TeamMembersListProps {
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  isOwner: boolean;
}

export function TeamMembersList({
  members,
  invitations,
  currentUserId,
  isOwner,
}: TeamMembersListProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null); // For confirm dialog
  const [deleteType, setDeleteType] = useState<"member" | "invitation" | null>(null);

  const handleRemove = async () => {
    if (!deleteId || !deleteType) return;
    setLoadingId(deleteId);

    try {
      const endpoint =
        deleteType === "member"
          ? `/api/team/members/${deleteId}`
          : `/api/team/invitations/${deleteId}`;

      const res = await fetch(endpoint, { method: "DELETE" });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to remove");
      }

      toast.success(
        deleteType === "member" ? t("team.member_removed") : t("team.invitation_revoked")
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoadingId(null);
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoadingId(memberId);
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      toast.success(t("team.role_updated"));
      router.refresh();
    } catch (error) {
      toast.error(t("team.role_update_error"));
    } finally {
      setLoadingId(null);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: t("team.role_owner"),
    admin: t("team.role_admin"),
    editor: t("team.role_editor"),
    viewer: t("team.role_viewer"),
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("team.table_user")}</TableHead>
              <TableHead>{t("team.table_role")}</TableHead>
              <TableHead>{t("team.table_joined")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.image || ""} />
                      <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-muted-foreground text-xs">{member.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {roleLabels[member.role] ?? member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(member.joinedAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={loadingId === member.id}>
                        {loadingId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("team.actions")}</DropdownMenuLabel>
                      {isOwner && member.userId !== currentUserId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={member.role}
                            onValueChange={(val) => handleRoleChange(member.id, val)}
                          >
                            <DropdownMenuRadioItem value="admin">
                              {t("team.role_admin")}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="editor">
                              {t("team.role_editor")}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="viewer">
                              {t("team.role_viewer")}
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeleteId(member.id);
                              setDeleteType("member");
                            }}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            {t("team.remove_member")}
                          </DropdownMenuItem>
                        </>
                      )}
                      {member.userId === currentUserId && (
                        <DropdownMenuItem disabled>{t("team.cannot_remove_self")}</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {/* Invitations */}
            {invitations.map((invite) => (
              <TableRow key={invite.id} className="bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3 opacity-70">
                    <div className="bg-muted border-muted-foreground/30 flex h-9 w-9 items-center justify-center rounded-full border border-dashed">
                      <Mail className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium">
                        {t("team.pending_invitation")}
                      </span>
                      <span className="text-muted-foreground text-xs">{invite.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize opacity-70">
                    {t("team.role_pending", { role: roleLabels[invite.role] ?? invite.role })}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {t("team.invite_sent", {
                    date: format(new Date(invite.createdAt), "MMM d, yyyy"),
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={loadingId === invite.id}>
                        {loadingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDeleteId(invite.id);
                          setDeleteType("invitation");
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("team.revoke_invitation")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {members.length === 0 && invitations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  {t("team.no_members")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("team.confirm_desc")}
              {deleteType === "member"
                ? t("team.confirm_remove_member")
                : t("team.confirm_revoke_invite")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("team.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              {deleteType === "member" ? t("team.remove_member") : t("team.revoke_invitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
