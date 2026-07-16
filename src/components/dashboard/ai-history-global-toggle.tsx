"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AiHistoryGlobalToggle({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("ai_history");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyCollapsed: !collapsed }),
      });
      if (!res.ok) throw new Error("Failed to save preference");
      router.refresh();
    } catch {
      toast.error(t("toggle_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleToggle} disabled={loading}>
      {loading ? (
        <Loader2 className="me-2 h-4 w-4 animate-spin" />
      ) : collapsed ? (
        <Eye className="me-2 h-4 w-4" />
      ) : (
        <EyeOff className="me-2 h-4 w-4" />
      )}
      {collapsed ? t("expand_all") : t("collapse_all")}
    </Button>
  );
}
