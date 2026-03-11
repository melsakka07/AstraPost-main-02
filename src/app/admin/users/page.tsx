import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { UsersTable } from "./users-table";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await db.select().from(user).orderBy(desc(user.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      </div>
      {/* @ts-ignore - Types might mismatch slightly due to date parsing/serialization */}
      <UsersTable users={users} />
    </div>
  );
}
