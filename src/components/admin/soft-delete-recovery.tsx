"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface SoftDeleteRecoveryProps {
  deletedUsers: Array<{ id: string; name: string | null; email: string; deletedAt: Date }>;
  deletedPosts: Array<{ id: string; status: string; userId: string; deletedAt: Date }>;
}

export function SoftDeleteRecovery({ deletedUsers, deletedPosts }: SoftDeleteRecoveryProps) {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const handleRestore = async (type: "user" | "post", id: string, label: string) => {
    setRestoring(`${type}-${id}`);
    try {
      const response = await fetch("/api/admin/soft-delete/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });

      if (response.ok) {
        const result = await response.json();
        setResults((prev) => ({
          ...prev,
          [`${type}-${id}`]: `✅ ${result.message}`,
        }));
        logger.info("soft_delete_recovery_success_ui", {
          type,
          id,
          label,
        });
      } else {
        const error = await response.json();
        setResults((prev) => ({
          ...prev,
          [`${type}-${id}`]: `❌ ${error.error || "Failed to restore"}`,
        }));
        logger.error("soft_delete_recovery_failed_ui", {
          type,
          id,
          error: error.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      setResults((prev) => ({
        ...prev,
        [`${type}-${id}`]: `❌ Error: ${message}`,
      }));
      logger.error("soft_delete_recovery_error_ui", {
        type,
        id,
        error: message,
      });
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Deleted Users */}
      {deletedUsers.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Deleted Users ({deletedUsers.length})</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Deleted</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {deletedUsers.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-2">{u.name || "—"}</td>
                    <td className="p-2 font-mono text-xs">{u.email}</td>
                    <td className="text-muted-foreground p-2 text-xs">
                      {u.deletedAt.toLocaleString()}
                    </td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore("user", u.id, u.email)}
                        disabled={restoring === `user-${u.id}`}
                        className="text-xs"
                      >
                        {restoring === `user-${u.id}` ? "Restoring..." : "Restore"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deleted Posts */}
      {deletedPosts.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Deleted Posts ({deletedPosts.length})</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 text-left">Post ID</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">User ID</th>
                  <th className="p-2 text-left">Deleted</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {deletedPosts.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{p.id}</td>
                    <td className="p-2">{p.status}</td>
                    <td className="p-2 font-mono text-xs">{p.userId}</td>
                    <td className="text-muted-foreground p-2 text-xs">
                      {p.deletedAt.toLocaleString()}
                    </td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore("post", p.id, p.id)}
                        disabled={restoring === `post-${p.id}`}
                        className="text-xs"
                      >
                        {restoring === `post-${p.id}` ? "Restoring..." : "Restore"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deletedUsers.length === 0 && deletedPosts.length === 0 && (
        <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
          No soft-deleted items
        </div>
      )}

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="bg-muted space-y-2 rounded-md p-3">
          <p className="text-sm font-semibold">Recovery Results:</p>
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="font-mono text-xs">
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
