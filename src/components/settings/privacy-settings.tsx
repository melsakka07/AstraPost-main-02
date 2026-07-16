"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

export function PrivacySettings() {
  const t = useTranslations("settings");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();

  async function handleExportData() {
    setExporting(true);
    try {
      const response = await fetch("/api/user/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `astrapost-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t("integrations.privacy_export_started_toast"));
    } catch (error) {
      toast.error(t("integrations.privacy_export_error_toast"));
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch("/api/user/delete", { method: "DELETE" });
      if (!response.ok) throw new Error("Deletion failed");

      toast.success(t("integrations.privacy_account_deleted_toast"));
      await authClient.signOut();
      router.push("/");
    } catch (error) {
      toast.error(t("integrations.privacy_delete_error_toast"));
      setDeleting(false);
    }
  }

  return (
    <Card className="border-danger-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-danger-11 h-5 w-5" />
          <CardTitle>{t("integrations.privacy_data_title")}</CardTitle>
        </div>
        <CardDescription>{t("integrations.privacy_data_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="font-medium">{t("integrations.privacy_export_data")}</div>
            <div className="text-muted-foreground text-sm">
              {t("integrations.privacy_export_desc")}
            </div>
          </div>
          <Button variant="outline" onClick={handleExportData} disabled={exporting}>
            {exporting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            <Download className="me-2 h-4 w-4" />
            {t("integrations.privacy_export_button")}
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="text-danger-11 font-medium">
              {t("integrations.privacy_delete_account")}
            </div>
            <div className="text-muted-foreground text-sm">
              {t("integrations.privacy_delete_desc")}
            </div>
          </div>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="me-2 h-4 w-4" />
                {t("integrations.privacy_delete_account")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("integrations.privacy_delete_confirm_title")}</DialogTitle>
                <DialogDescription>
                  {t("integrations.privacy_delete_confirm_desc")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  {t("integrations.cancel")}
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("integrations.privacy_delete_confirm_button")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
