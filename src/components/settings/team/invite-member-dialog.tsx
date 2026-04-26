"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getInviteSchema(t: ReturnType<typeof useTranslations<"settings">>) {
  return z.object({
    email: z.string().email({ message: t("team.invite_validation_email") }),
    role: z.enum(["admin", "editor", "viewer"]),
  });
}

type InviteFormValues = z.infer<ReturnType<typeof getInviteSchema>>;

export function InviteMemberDialog() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inviteSchema = useMemo(() => getInviteSchema(t), [t]);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "viewer",
    },
  });

  async function onSubmit(data: InviteFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to send invitation");
      }

      toast.success(t("team.invite_success"));
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t("team.invite_error"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("team.invite_button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("team.invite_dialog_title")}</DialogTitle>
          <DialogDescription>{t("team.invite_dialog_desc")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>{t("team.invite_email_label")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="text-muted-foreground absolute start-2.5 top-2.5 h-4 w-4" />
                      <Input
                        placeholder={t("team.invite_email_placeholder")}
                        className="ps-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>{t("team.invite_role_label")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("team.invite_role_placeholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex flex-col">
                          <span>{t("team.role_viewer")}</span>
                          <span className="text-muted-foreground text-xs">
                            {t("team.role_viewer_desc")}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex flex-col">
                          <span>{t("team.role_editor")}</span>
                          <span className="text-muted-foreground text-xs">
                            {t("team.role_editor_desc")}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex flex-col">
                          <span>{t("team.role_admin")}</span>
                          <span className="text-muted-foreground text-xs">
                            {t("team.role_admin_desc")}
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? t("team.invite_sending") : t("team.invite_send")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
