"use client";

import { format } from "date-fns";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReferredUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
}

interface ReferralProps {
  referralCode: string | null;
  referredUsers: ReferredUser[];
  referralCredits: number;
  referralCount: number;
}

export function ReferralSection({
  referralCode,
  referredUsers,
  referralCredits,
  referralCount,
}: ReferralProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Referrals</CardTitle>
        <Gift className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Referral Code Badge */}
          {referralCode && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Referral Code:</span>
              <Badge variant="secondary" className="font-mono">
                {referralCode}
              </Badge>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{referralCount}</p>
              <p className="text-muted-foreground text-xs">Total Referrals</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{referralCredits}</p>
              <p className="text-muted-foreground text-xs">Credits Earned</p>
            </div>
          </div>

          {/* Referred Users Table */}
          {referredUsers.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Referred Users</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {referredUsers.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">No referred users yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
