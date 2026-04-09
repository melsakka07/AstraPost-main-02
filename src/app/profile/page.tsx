"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Calendar, User, Shield, ArrowLeft, Lock, Smartphone } from "lucide-react";
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
        <div>Loading...</div>
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
    toast.info("Profile updates require backend implementation");
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
          Back
        </Button>
        <h1 className="text-3xl font-bold">Your Profile</h1>
      </div>

      <div className="grid gap-6">
        {/* Profile Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user.image || ""}
                  alt={user.name || "User"}
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
                      <Shield className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                {createdDate && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {createdDate}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm font-medium">Full Name</label>
                <div className="bg-muted/10 rounded-md border p-3">
                  {user.name || "Not provided"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm font-medium">Email Address</label>
                <div className="bg-muted/10 flex items-center justify-between rounded-md border p-3">
                  <span>{user.email}</span>
                  {user.emailVerified && (
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Account Status</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Email Verification</p>
                    <p className="text-muted-foreground text-sm">
                      Email address verification status
                    </p>
                  </div>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Account Type</p>
                    <p className="text-muted-foreground text-sm">Your account access level</p>
                  </div>
                  <Badge variant="outline">Standard</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent account activity and sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-muted-foreground text-sm">Active now</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-600">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your account settings and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setEditProfileOpen(true)}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Edit Profile</div>
                  <div className="text-muted-foreground text-xs">Update your information</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setSecurityOpen(true)}
              >
                <Shield className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Security Settings</div>
                  <div className="text-muted-foreground text-xs">Manage security options</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setEmailPrefsOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Email Preferences</div>
                  <div className="text-muted-foreground text-xs">Configure notifications</div>
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
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information. Changes will be saved to your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user.name || ""} placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-muted-foreground text-xs">
                Email cannot be changed for OAuth accounts
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditProfileOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Security Settings</DialogTitle>
            <DialogDescription>
              Manage your account security and authentication options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Lock className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-muted-foreground text-sm">
                    {user.email?.includes("@gmail")
                      ? "Managed by Google"
                      : "Set a password for your account"}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {user.email?.includes("@gmail") ? "OAuth" : "Not Set"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-muted-foreground text-sm">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Shield className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-muted-foreground text-sm">
                    Manage devices logged into your account
                  </p>
                </div>
              </div>
              <Badge variant="default">1 Active</Badge>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setSecurityOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Preferences Dialog */}
      <Dialog open={emailPrefsOpen} onOpenChange={setEmailPrefsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Email Preferences</DialogTitle>
            <DialogDescription>Configure your email notification settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-muted-foreground text-sm">Product updates and announcements</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-muted-foreground text-sm">Important security notifications</p>
              </div>
              <Badge variant="default">Always On</Badge>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setEmailPrefsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
