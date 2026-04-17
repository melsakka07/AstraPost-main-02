"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Save, User, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientLogger } from "@/lib/client-logger";
import { LANGUAGES } from "@/lib/constants";

interface ProfileFormProps {
  initialData: {
    name: string;
    email: string;
    timezone?: string | null;
    language?: string | null;
    image?: string | null;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData.name,
    timezone: initialData.timezone || "Asia/Riyadh",
    language: initialData.language || "ar",
    image: initialData.image || null,
  });

  const timezones = Intl.supportedValuesOf("timeZone");

  const formatPreview = (timezone: string, language: string) => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    });
    return formatter.format(now);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingAvatar(true);

    try {
      const formDataForUpload = new FormData();
      formDataForUpload.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formDataForUpload,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      setFormData({ ...formData, image: data.url });
      toast.success("Avatar uploaded successfully");
    } catch (error) {
      clientLogger.error("Avatar upload failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      clientLogger.error("Failed to update profile", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="text-primary h-5 w-5" />
          <CardTitle>Profile</CardTitle>
        </div>
        <CardDescription>Manage your account details and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              {formData.image ? (
                <Image
                  src={formData.image}
                  alt={formData.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                  <User className="text-muted-foreground h-8 w-8" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, image: null })}
                    disabled={uploadingAvatar}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-xs">JPG, PNG, WebP, or GIF up to 10MB</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={initialData.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[0.8rem]">
                Posts will be scheduled in this timezone.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Interface Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-full">
            <p className="text-muted-foreground text-sm">
              Your posts will show as:{" "}
              <strong>{formatPreview(formData.timezone, formData.language)}</strong>
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
