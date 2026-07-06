import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import type { InboxAccount } from "@/components/inbox/inbox-filter-bar";
import { InboxPageClient } from "@/components/inbox/inbox-page";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

/**
 * Inbox dashboard page — RSC server component.
 *
 * Authenticates the user via getTeamContext(), fetches the user's active
 * X accounts for the filter bar, and passes them to the client inbox page.
 */
export default async function InboxPage() {
  const ctx = await getTeamContext();
  if (!ctx) {
    redirect("/login?callbackUrl=/dashboard/inbox");
  }

  const rows = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, true)),
    columns: {
      id: true,
      xUsername: true,
    },
  });

  const accounts: InboxAccount[] = rows.map((row) => ({
    id: row.id,
    handle: row.xUsername,
  }));

  return <InboxPageClient accounts={accounts} />;
}
