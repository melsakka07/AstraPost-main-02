"use client";

import { useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mic, Trash2, Loader2, Sparkles, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { BlurredOverlay } from "@/components/ui/blurred-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { clientLogger } from "@/lib/client-logger";

interface VoiceProfile {
  tone: string;
  styleKeywords: string[];
  emojiUsage: string;
  sentenceStructure: string;
  vocabularyLevel: string;
  formattingHabits: string;
  doAndDonts: string[];
}

interface VoiceProfileFormProps {
  userPlan?: string;
}

function getVoiceProfileSchema(t: ReturnType<typeof useTranslations<"settings">>) {
  return z.object({
    samples: z
      .array(
        z.object({
          value: z.string(),
        })
      )
      .refine((arr) => arr.filter((s) => s.value.trim().length > 10).length >= 3, {
        message: t("integrations.voice_validation_samples"),
      }),
  });
}

type VoiceProfileValues = z.infer<ReturnType<typeof getVoiceProfileSchema>>;

export function VoiceProfileForm({ userPlan = "free" }: VoiceProfileFormProps) {
  const t = useTranslations("settings");
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { openWithContext } = useUpgradeModal();
  const isFree = userPlan === "free";

  const voiceProfileSchema = useMemo(() => getVoiceProfileSchema(t), [t]);

  const form = useForm<VoiceProfileValues>({
    resolver: zodResolver(voiceProfileSchema),
    defaultValues: {
      samples: [{ value: "" }, { value: "" }, { value: "" }],
    },
    mode: "onChange", // Enable real-time validation feedback
  });

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "samples",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/voice-profile");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProfile(data.voiceProfile);
    } catch (e) {
      clientLogger.error("Failed to fetch voice profile", {
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: VoiceProfileValues) => {
    const validSamples = data.samples.map((s) => s.value).filter((s) => s.trim().length > 10);

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/user/voice-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweets: validSamples }),
      });

      if (res.status === 402) {
        const payload = await res.json();
        openWithContext({
          feature: "voice_profile",
          message: payload.message || "Voice Profile is a Pro feature.",
          suggestedPlan: "pro_monthly",
        });
        return;
      }

      if (!res.ok) throw new Error("Analysis failed");

      const responseData = await res.json();
      setProfile(responseData);
      toast.success(t("integrations.voice_created_success"));
    } catch (e) {
      clientLogger.error("Failed to analyze voice profile samples", {
        sampleCount: validSamples.length,
        error: e instanceof Error ? e.message : String(e),
      });
      toast.error(t("integrations.voice_analyze_error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("integrations.voice_delete_confirm"))) return;

    try {
      const res = await fetch("/api/user/voice-profile", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setProfile(null);
      form.reset({ samples: [{ value: "" }, { value: "" }, { value: "" }] });
      toast.success(t("integrations.voice_deleted_success"));
    } catch (e) {
      toast.error(t("integrations.voice_delete_error"));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="text-primary h-5 w-5" />
              {t("integrations.voice_profile_title")}
            </CardTitle>
            <CardDescription>{t("integrations.voice_profile_description")}</CardDescription>
          </div>
          {profile && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              {t("integrations.active")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <BlurredOverlay
          isLocked={isFree}
          title={t("integrations.voice_profile_pro_title")}
          description={t("integrations.voice_profile_pro_desc")}
        >
          <div className="space-y-6">
            {profile ? (
              <div className="space-y-4">
                <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-muted-foreground text-sm font-semibold uppercase">
                      {t("integrations.voice_analysis_title")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("integrations.reset_voice_profile")}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-foreground font-medium">
                        {t("integrations.voice_tone_label")}
                      </span>
                      <p className="text-muted-foreground">{profile.tone}</p>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        {t("integrations.voice_structure_label")}
                      </span>
                      <p className="text-muted-foreground">{profile.sentenceStructure}</p>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        {t("integrations.voice_vocabulary_label")}
                      </span>
                      <p className="text-muted-foreground">{profile.vocabularyLevel}</p>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        {t("integrations.voice_emojis_label")}
                      </span>
                      <p className="text-muted-foreground">{profile.emojiUsage}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-foreground text-sm font-medium">
                      {t("integrations.voice_style_rules_label")}
                    </span>
                    <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-1 text-sm">
                      {profile.doAndDonts.map((rule, i) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{t("integrations.voice_active_notice")}</p>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t("integrations.voice_add_samples")}</h3>
                    <p className="text-muted-foreground text-sm">
                      {t("integrations.voice_samples_desc")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`samples.${index}.value`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Textarea
                                  {...inputField}
                                  placeholder={t("integrations.voice_sample_placeholder", {
                                    index: index + 1,
                                  })}
                                  className="min-h-[80px] resize-none pr-10"
                                />
                                {fields.length > 3 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive absolute top-2 right-2 h-6 w-6"
                                    onClick={() => remove(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  {fields.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ value: "" })}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("integrations.voice_add_sample_button")}
                    </Button>
                  )}

                  {form.formState.errors.samples?.root && (
                    <p className="text-destructive text-sm font-medium">
                      {form.formState.errors.samples.root.message}
                    </p>
                  )}

                  <div className="bg-primary/10 text-primary flex items-start gap-3 rounded-lg p-4 text-sm">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{t("integrations.voice_analyze_description")}</p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={!isDirty || !isValid || isAnalyzing}>
                      {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("integrations.voice_analyze_button")}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </BlurredOverlay>
      </CardContent>
    </Card>
  );
}
