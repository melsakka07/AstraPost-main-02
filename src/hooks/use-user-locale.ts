"use client";

import { useSession } from "@/lib/auth-client";

export function useUserLocale(): string {
  const { data: session } = useSession();
  return session?.user && "language" in session.user && (session.user as any).language
    ? (session.user as any).language
    : "en";
}
