"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, User, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

function getProfileFormSchema(t: ReturnType<typeof useTranslations<"settings">>) {
  return z.object({
    name: z
      .string()
      .min(2, t("profile.validation.name_min"))
      .max(50, t("profile.validation.name_max")),
    timezone: z.string().min(1, t("profile.validation.timezone_required")),
    language: z.string().min(2, t("profile.validation.language_required")).max(10),
    image: z.string().nullable().optional(),
  });
}

type ProfileFormValues = z.infer<ReturnType<typeof getProfileFormSchema>>;

export function ProfileForm({ initialData }: ProfileFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const profileFormSchema = useMemo(() => getProfileFormSchema(t), [t]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initialData.name,
      timezone: initialData.timezone || "Asia/Riyadh",
      language: initialData.language || "ar",
      image: initialData.image || null,
    },
    mode: "onChange", // Enable real-time validation feedback
  });

  const timezones = Intl.supportedValuesOf("timeZone");
  const { isDirty, isValid } = form.formState;

  // UA-A15: Warn before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
      toast.error(t("profile.error_file_type"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("profile.error_file_size"));
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
      form.setValue("image", data.url, { shouldDirty: true, shouldValidate: true });
      toast.success(t("profile.avatar_uploaded"));
    } catch (error) {
      clientLogger.error("Avatar upload failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("profile.error_upload"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      toast.success(t("profile.saved"));
      router.refresh();
    } catch (error) {
      clientLogger.error("Failed to update profile", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("profile.error_save"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="text-primary h-5 w-5" />
          <CardTitle>
            {t("profile.profile_card_title")}
            {isDirty && <span className="text-destructive ml-1">*</span>}
          </CardTitle>
        </div>
        <CardDescription>{t("profile.profile_card_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {form.watch("image") ? (
                  <Image
                    src={form.watch("image")!}
                    alt={form.watch("name")}
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
                    title={t("profile.avatar_title")}
                    aria-label={t("profile.avatar_title")}
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
                        {t("profile.avatar_uploading")}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("profile.avatar_upload")}
                      </>
                    )}
                  </Button>
                  {form.watch("image") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => form.setValue("image", null, { shouldDirty: true })}
                      disabled={uploadingAvatar}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t("profile.avatar_remove")}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground text-xs">{t("profile.avatar_hint")}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.display_name_label")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label htmlFor="email">{t("profile.email_label")}</Label>
                <Input id="email" value={initialData.email} disabled className="bg-muted" />
              </div>
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.timezone_label")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("profile.timezone_placeholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("profile.timezone_description")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.language_label")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("profile.language_placeholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-full">
              <p className="text-muted-foreground text-sm">
                {t("profile.preview_text")}{" "}
                <strong>{formatPreview(form.watch("timezone"), form.watch("language"))}</strong>
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || !isValid || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t("profile.save")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
