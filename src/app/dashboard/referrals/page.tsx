import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Referrals - AstraPost",
  description: "Invite friends and earn rewards",
};

export default async function ReferralsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch fresh user data including referral code
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      referralCode: true,
      referralCredits: true,
    },
    with: {
      referrals: true // To count them
    }
  });

  if (!currentUser) {
    redirect("/login");
  }

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${currentUser.referralCode}`;
  const referralCount = currentUser.referrals.length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Referrals</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Referrals
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralCount}</div>
            <p className="text-xs text-muted-foreground">
              Friends joined using your code
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Earned Credits
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentUser.referralCredits || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for next invoice
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Share Your Link</CardTitle>
            <CardDescription>
              Share this link with your friends to earn rewards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Referral Link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={referralLink} className="flex-1" />
                <CopyButton value={referralLink} className="text-primary hover:text-primary-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Your Code
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={currentUser.referralCode || "Generating..."} className="flex-1" />
                <CopyButton value={currentUser.referralCode || ""} className="text-primary hover:text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
             <CardHeader>
                <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                    <li>Share your unique referral link or code.</li>
                    <li>Friends sign up and get a 14-day extended trial.</li>
                    <li>You get $10 credit for every friend who subscribes to Pro.</li>
                </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
