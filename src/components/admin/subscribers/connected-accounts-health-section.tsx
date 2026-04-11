"use client";

import { format, differenceInDays } from "date-fns";
import { AlertCircle, Twitter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ConnectedAccount {
  id: string;
  username: string;
  tokenExpiry: Date | null;
  isHealthy: boolean;
}

interface ConnectedAccountsHealthProps {
  accounts: ConnectedAccount[];
}

export function ConnectedAccountsHealthSection({ accounts }: ConnectedAccountsHealthProps) {
  const getHealthStatus = (expiry: Date | null) => {
    if (!expiry) {
      return { status: "unknown", color: "bg-gray-500", text: "Unknown" };
    }

    const daysUntilExpiry = differenceInDays(new Date(expiry), new Date());

    if (daysUntilExpiry < 0) {
      return { status: "expired", color: "bg-red-500", text: "Expired" };
    }

    if (daysUntilExpiry < 7) {
      return { status: "expiring", color: "bg-yellow-500", text: "Expiring Soon" };
    }

    return { status: "healthy", color: "bg-green-500", text: "Healthy" };
  };

  const getExpiryText = (expiry: Date | null) => {
    if (!expiry) return "No expiry data";

    const daysUntilExpiry = differenceInDays(new Date(expiry), new Date());

    if (daysUntilExpiry < 0) {
      return `Expired on ${format(new Date(expiry), "MMM d, yyyy")}`;
    }

    if (daysUntilExpiry === 0) {
      return "Expires today";
    }

    if (daysUntilExpiry === 1) {
      return "Expires tomorrow";
    }

    return `Expires in ${daysUntilExpiry} days (${format(new Date(expiry), "MMM d, yyyy")})`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
        <Twitter className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {accounts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Token Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const health = getHealthStatus(account.tokenExpiry);

                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">@{account.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", health.color)} />
                        <span className="text-sm">{health.text}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{getExpiryText(account.tokenExpiry)}</span>
                        {health.status === "expired" && (
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        )}
                        {health.status === "expiring" && (
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">No connected accounts</p>
        )}
      </CardContent>
    </Card>
  );
}
