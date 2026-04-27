"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientLogger } from "@/lib/client-logger";

export function ExportButton({ range }: { range: string }) {
  const t = useTranslations("analytics");

  const handleExport = async (format: "csv" | "pdf") => {
    const loadingToast = toast.loading(`Generating ${format.toUpperCase()} export...`);

    try {
      const response = await fetch(`/api/analytics/export?format=${format}&range=${range}`);

      if (!response.ok) {
        if (response.status === 402) {
          toast.dismiss(loadingToast);
          toast.error(t("upgrade_cta"));
          return;
        }
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss(loadingToast);
      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t("toasts.export_failed"));
      clientLogger.error("Analytics export failed", {
        format,
        range,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>Export as PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
