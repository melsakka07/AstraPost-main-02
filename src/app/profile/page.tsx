"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Calendar, User, Shield, ArrowLeft, Lock, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth-client";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [emailPrefsOpen, setEmailPrefsOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div>{t("loading")}</div>
      </div>
    );
  }

  const user = session.user;
  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleEditProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In a real app, this would call an API to update the user profile
    toast.info(t("updates_require_backend"));
    setEditProfileOpen(false);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          {t("back")}
        </Button>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid gap-6">
        {/* Profile Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user.image || ""}
                  alt={user.name || t("avatar_alt")}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="text-lg">
                  {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                  {user.emailVerified && (
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      <Shield className="me-1 h-3 w-3" />
                      {t("verified")}
                    </Badge>
                  )}
                </div>
                {createdDate && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{t("member_since", { date: createdDate })}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("account_info_title")}</CardTitle>
            <CardDescription>{t("account_info_description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm font-medium">
                  {t("full_name")}
                </label>
                <div className="bg-muted/10 rounded-md border p-3">
                  {user.name || t("not_provided")}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm font-medium">
                  {t("email_address")}
                </label>
                <div className="bg-muted/10 flex items-center justify-between rounded-md border p-3">
                  <span>{user.email}</span>
                  {user.emailVerified && (
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      {t("verified")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("account_status")}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{t("email_verification")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("email_verification_description")}
                    </p>
                  </div>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? t("verified") : t("unverified")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{t("account_type")}</p>
                    <p className="text-muted-foreground text-sm">{t("account_type_description")}</p>
                  </div>
                  <Badge variant="outline">{t("account_type_standard")}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recent_activity_title")}</CardTitle>
            <CardDescription>{t("recent_activity_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium">{t("current_session")}</p>
                    <p className="text-muted-foreground text-sm">{t("active_now")}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-600">
                  {t("active")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("quick_actions_title")}</CardTitle>
            <CardDescription>{t("quick_actions_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setEditProfileOpen(true)}
              >
                <User className="me-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{t("edit_profile")}</div>
                  <div className="text-muted-foreground text-xs">
                    {t("update_your_information")}
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setSecurityOpen(true)}
              >
                <Shield className="me-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{t("security_settings")}</div>
                  <div className="text-muted-foreground text-xs">
                    {t("manage_security_options")}
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setEmailPrefsOpen(true)}
              >
                <Mail className="me-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{t("email_preferences")}</div>
                  <div className="text-muted-foreground text-xs">
                    {t("configure_notifications")}
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("edit_profile_title")}</DialogTitle>
            <DialogDescription>{t("edit_profile_description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("full_name")}</Label>
              <Input id="name" defaultValue={user.name || ""} placeholder={t("name_placeholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email_label")}</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-muted-foreground text-xs">{t("email_oauth_warning")}</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditProfileOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save_changes")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("security_settings_title")}</DialogTitle>
            <DialogDescription>{t("security_settings_description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Lock className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">{t("password")}</p>
                  <p className="text-muted-foreground text-sm">
                    {user.email?.includes("@gmail") ? t("managed_by_google") : t("set_password")}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {user.email?.includes("@gmail") ? t("oauth") : t("not_set")}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">{t("two_factor_auth")}</p>
                  <p className="text-muted-foreground text-sm">
                    {t("two_factor_auth_description")}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                {t("coming_soon")}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Shield className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">{t("active_sessions")}</p>
                  <p className="text-muted-foreground text-sm">{t("manage_sessions")}</p>
                </div>
              </div>
              <Badge variant="default">{t("active_count", { count: 1 })}</Badge>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setSecurityOpen(false)}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Preferences Dialog */}
      <Dialog open={emailPrefsOpen} onOpenChange={setEmailPrefsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("email_preferences_title")}</DialogTitle>
            <DialogDescription>{t("email_preferences_description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{t("marketing_emails")}</p>
                <p className="text-muted-foreground text-sm">{t("marketing_emails_description")}</p>
              </div>
              <Badge variant="secondary">{t("coming_soon")}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{t("security_alerts")}</p>
                <p className="text-muted-foreground text-sm">{t("security_alerts_description")}</p>
              </div>
              <Badge variant="default">{t("always_on")}</Badge>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setEmailPrefsOpen(false)}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
