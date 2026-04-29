"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, signOut } from "@/lib/auth-client";

interface UserProfileProps {
  user?: {
    name: string;
    email?: string | null | undefined;
    image?: string | null | undefined;
  } | null;
}

export function UserProfile({ user: initialUser }: UserProfileProps = {}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");

  const user = initialUser || session?.user;

  if (isPending && !user) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            {tNav("sign_in")}
          </Button>
        </Link>
        <Link href="/login">
          <Button size="sm">{t("sign_up")}</Button>
        </Link>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer transition-opacity hover:opacity-80">
          <AvatarImage
            src={user.image || ""}
            alt={user.name || t("user")}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback>
            {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium" dir="auto">
              {user.name}
            </p>
            <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="me-2 h-4 w-4" />
            {t("your_profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <LogOut className="me-2 h-4 w-4" />
          {t("log_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
