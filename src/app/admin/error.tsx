"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Page error:", error);
  }, [error]);

  return (
    <AdminPageWrapper
      icon={AlertCircle}
      title="Error"
      description="Something went wrong loading this page."
    >
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <AlertCircle className="text-destructive h-12 w-12" />
        <p className="text-muted-foreground max-w-md text-sm">
          {error.message || "An unexpected error occurred while loading the admin panel."}
        </p>
        {error.digest && <p className="text-muted-foreground text-xs">Error ID: {error.digest}</p>}
        <Button onClick={reset} variant="outline" size="sm">
          Try again
        </Button>
      </div>
    </AdminPageWrapper>
  );
}
