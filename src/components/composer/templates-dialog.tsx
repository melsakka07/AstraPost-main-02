"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { getTemplatePrompt } from "@/lib/ai/template-prompts";
import type {
  OutputFormat,
  TemplateAiMeta,
  TemplatePromptConfig,
} from "@/lib/ai/template-prompts";
import { LANGUAGES } from "@/lib/constants";
import type { ToneCode } from "@/lib/constants";
import {
  SYSTEM_TEMPLATES,
  Template,
  fetchUserTemplates,
  deleteUserTemplate,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_OPTIONS: { value: ToneCode; label: string }[] = [
  { value: "professional",  label: "Professional"  },
  { value: "casual",        label: "Casual"        },
  { value: "educational",   label: "Educational"   },
  { value: "inspirational", label: "Inspirational" },
  { value: "humorous",      label: "Humorous"      },
  { value: "viral",         label: "Viral"         },
  { value: "controversial", label: "Controversial" },
];

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "single",       label: "Single Tweet"        },
  { value: "thread-short", label: "Thread (3–5 tweets)" },
  { value: "thread-long",  label: "Thread (5–10 tweets)" },
];

const SYSTEM_CATEGORIES = ["All", "Educational", "Promotional", "Personal", "Engagement"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplatesDialogProps {
  onSelect: (tweets: string[], aiMeta?: TemplateAiMeta) => void;
  defaultLanguage?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplatesDialog({
  onSelect,
  defaultLanguage = "en",
}: TemplatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "generate">("list");
  const [selectedConfig, setSelectedConfig] =
    useState<TemplatePromptConfig | null>(null);

  // Generation form state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ToneCode>("professional");
  const [language, setLanguage] = useState(defaultLanguage);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("thread-short");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedCount, setStreamedCount] = useState(0);

  // Quota state — fetched lazily when the generate view opens
  const [quota, setQuota] = useState<{ used: number; limit: number | null } | null>(null);

  // User templates state
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [loadingUserTemplates, setLoadingUserTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState("system");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userTemplatesPage, setUserTemplatesPage] = useState(0);

  const { openWithContext: openUpgradeModal } = useUpgradeModal();

  // Reset to list view when dialog closes
  useEffect(() => {
    if (!open) {
      setView("list");
      setSelectedConfig(null);
      setTopic("");
      setIsGenerating(false);
      setStreamedCount(0);
      setQuota(null);
    }
  }, [open]);

  // Fetch quota once when generate view opens
  useEffect(() => {
    if (view !== "generate" || quota !== null) return;
    fetch("/api/ai/quota")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setQuota({ used: data.used ?? 0, limit: data.limit ?? null });
      })
      .catch(() => {});
  }, [view, quota]);

  // Sync language when the parent's defaultLanguage changes
  useEffect(() => {
    setLanguage(defaultLanguage);
  }, [defaultLanguage]);

  const loadUserTemplates = async () => {
    try {
      setLoadingUserTemplates(true);
      const data = await fetchUserTemplates();
      setUserTemplates(data);
      setUserTemplatesPage(0);
    } catch {
      // Silently fail
    } finally {
      setLoadingUserTemplates(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === "my-templates") {
      loadUserTemplates();
    }
  }, [open, activeTab]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteUserTemplate(id);
      setUserTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  // User template click — insert static content directly
  const handleUserTemplateSelect = (template: Template) => {
    onSelect(template.content, template.aiMeta ?? undefined);
    setOpen(false);
  };

  // User template with aiMeta — pre-fill the generate form with saved params
  const handleUserTemplateRegenerate = (template: Template) => {
    const meta = template.aiMeta;
    if (!meta) return;
    const config = getTemplatePrompt(meta.templateId);
    if (!config) {
      onSelect(template.content);
      setOpen(false);
      return;
    }
    setSelectedConfig(config);
    setTone(meta.tone as ToneCode);
    setLanguage(meta.language);
    setOutputFormat(meta.outputFormat as OutputFormat);
    setTopic("");
    setView("generate");
  };

  // System template click — go to AI generation form
  const handleSystemTemplateClick = (template: Template) => {
    const config = getTemplatePrompt(template.id);
    if (!config) {
      onSelect(template.content);
      setOpen(false);
      return;
    }
    setSelectedConfig(config);
    setTone(config.defaultTone);
    setOutputFormat(config.defaultFormat);
    setTopic("");
    setView("generate");
  };

  // SSE streaming generation
  const handleGenerate = async () => {
    if (!selectedConfig || topic.trim().length < 3) return;
    setIsGenerating(true);
    setStreamedCount(0);

    try {
      const res = await fetch("/api/ai/template-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedConfig.id,
          topic: topic.trim(),
          tone,
          language,
          outputFormat,
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          let payload: Record<string, unknown> | null = null;
          try {
            payload = await res.json();
          } catch {}
          openUpgradeModal({
            error:         (payload?.error         as string)  ?? undefined,
            code:          (payload?.code          as string)  ?? undefined,
            message:       (payload?.message       as string)  ?? undefined,
            feature:       (payload?.feature       as string)  ?? undefined,
            plan:          (payload?.plan          as string)  ?? undefined,
            limit:         (payload?.limit         as number)  ?? undefined,
            used:          (payload?.used          as number)  ?? undefined,
            remaining:     (payload?.remaining     as number)  ?? undefined,
            upgradeUrl:    (payload?.upgrade_url   as string)  ?? undefined,
            suggestedPlan: (payload?.suggested_plan as string) ?? undefined,
            trialActive:   (payload?.trial_active  as boolean) ?? undefined,
            resetAt:       (payload?.reset_at      as string)  ?? undefined,
          });
          return;
        }
        if (res.status === 429) {
          const body = (await res.json().catch(() => ({}))) as {
            retryAfter?: number;
          };
          const wait = body.retryAfter ? ` Try again in ${body.retryAfter}s.` : "";
          toast.error(`Rate limit reached.${wait}`);
          return;
        }
        throw new Error("Generation failed");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamDone = false;
      const collectedTweets: string[] = [];

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as {
              done?: boolean;
              error?: string;
              tweet?: string;
            };
            if (event.error) {
              toast.error("Generation failed. Please try again.");
              streamDone = true;
              break;
            }
            if (event.done) {
              streamDone = true;
              break;
            }
            if (typeof event.tweet === "string" && event.tweet.length > 0) {
              collectedTweets.push(event.tweet);
              setStreamedCount(collectedTweets.length);
            }
          } catch {
            // partial line — skip
          }
        }
      }

      if (collectedTweets.length === 0) throw new Error("No tweets generated");

      const aiMeta: TemplateAiMeta = {
        templateId: selectedConfig.id,
        tone,
        language,
        outputFormat,
      };
      onSelect(collectedTweets, aiMeta);
      setOpen(false);
      toast.success("Content generated!");
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
      setStreamedCount(0);
    }
  };

  // ─── Derived state ──────────────────────────────────────────────────────────

  const filteredSystem =
    selectedCategory === "All"
      ? SYSTEM_TEMPLATES
      : SYSTEM_TEMPLATES.filter((t) => t.category === selectedCategory);

  const USER_TEMPLATES_PAGE_SIZE = 6;
  const userTemplatesPageCount = Math.ceil(
    userTemplates.length / USER_TEMPLATES_PAGE_SIZE
  );
  const pagedUserTemplates = userTemplates.slice(
    userTemplatesPage * USER_TEMPLATES_PAGE_SIZE,
    (userTemplatesPage + 1) * USER_TEMPLATES_PAGE_SIZE
  );

  // Remaining quota helpers
  const remaining =
    quota?.limit !== null && quota?.limit !== undefined
      ? Math.max(0, quota.limit - quota.used)
      : null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>

      {/* Consistent sizing with other composer dialogs */}
      <DialogContent className="max-w-2xl w-full max-h-[90dvh] flex flex-col gap-0 p-0">
        {/* ── GENERATE VIEW ───────────────────────────────────────────── */}
        {view === "generate" && selectedConfig ? (
          <>
            {/* Header */}
            <div className="flex flex-col gap-3 px-6 pt-6 pb-4 border-b shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setView("list")}
                disabled={isGenerating}
                aria-label="Back to templates"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to templates
              </Button>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {selectedConfig.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {selectedConfig.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Form body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="template-topic" className="text-sm font-medium">
                  Topic <span className="text-destructive" aria-hidden>*</span>
                </Label>
                <Input
                  id="template-topic"
                  placeholder={selectedConfig.placeholderTopic}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                  autoFocus
                  maxLength={500}
                  className="h-10"
                  aria-describedby="template-topic-hint template-topic-error"
                />
                <div className="flex items-center justify-between min-h-[1.25rem]">
                  <p
                    id="template-topic-error"
                    role="alert"
                    aria-live="polite"
                    className={cn(
                      "text-xs text-destructive transition-opacity",
                      topic.trim().length > 0 && topic.trim().length < 3
                        ? "opacity-100"
                        : "opacity-0 select-none pointer-events-none"
                    )}
                  >
                    Minimum 3 characters required.
                  </p>
                  <p
                    id="template-topic-hint"
                    className="text-xs text-muted-foreground tabular-nums ml-auto"
                  >
                    {topic.length}/500
                  </p>
                </div>
              </div>

              {/* Tone · Language · Format */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-tone" className="text-sm font-medium">
                    Tone
                  </Label>
                  <Select
                    value={tone}
                    onValueChange={(v) => setTone(v as ToneCode)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="template-tone" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-language" className="text-sm font-medium">
                    Language
                  </Label>
                  <Select
                    value={language}
                    onValueChange={setLanguage}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="template-language" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-format" className="text-sm font-medium">
                    Format
                  </Label>
                  <Select
                    value={outputFormat}
                    onValueChange={(v) => setOutputFormat(v as OutputFormat)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="template-format" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Streaming progress — shown while generating */}
              {isGenerating && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Generating content…
                    </p>
                    {streamedCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {streamedCount} tweet{streamedCount !== 1 ? "s" : ""} ready
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer — pinned */}
            <div className="shrink-0 border-t px-6 py-4 space-y-3">
              {/* Quota — only shown for limited-plan users */}
              {remaining !== null && (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-xs",
                    remaining <= 2
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : remaining <= 5
                        ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                        : "border-border bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>AI generations remaining this month</span>
                  <span className="font-semibold tabular-nums">{remaining}</span>
                </div>
              )}

              <Button
                className="w-full gap-2"
                size="default"
                onClick={handleGenerate}
                disabled={isGenerating || topic.trim().length < 3}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* ── LIST VIEW ──────────────────────────────────────────────── */
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogHeader>
                <DialogTitle className="text-base">Content Templates</DialogTitle>
                <DialogDescription>
                  Choose a proven structure — AI will write the content for you.
                </DialogDescription>
              </DialogHeader>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="px-6 pt-4 shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="system" className="flex-1">
                    System Templates
                  </TabsTrigger>
                  <TabsTrigger value="my-templates" className="flex-1">
                    My Templates
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── System templates ──────────────────────────────────── */}
              <TabsContent
                value="system"
                className="flex flex-col flex-1 min-h-0 mt-0"
              >
                {/* Category filter — horizontally scrollable pill row */}
                <div className="px-6 pt-3 pb-3 shrink-0">
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {SYSTEM_CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        size="sm"
                        className="shrink-0 h-7 px-3 text-xs"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Template cards grid — scrollable */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredSystem.map((template) => {
                      const hasAi = Boolean(getTemplatePrompt(template.id));
                      return (
                        <button
                          key={template.id}
                          type="button"
                          className={cn(
                            "group relative flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-all",
                            "hover:border-primary/60 hover:bg-muted/40 hover:shadow-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            "active:scale-[0.99]"
                          )}
                          onClick={() => handleSystemTemplateClick(template)}
                          aria-label={`Select ${template.title} template`}
                        >
                          {/* Top row — title + badges */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-snug">
                              {template.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {hasAi && (
                                <Badge
                                  variant="default"
                                  className="gap-1 py-0 h-5 text-[10px] px-1.5"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  AI
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className="capitalize py-0 h-5 text-[10px] px-1.5"
                              >
                                {template.category}
                              </Badge>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {template.description}
                          </p>

                          {/* CTA hint */}
                          <div className="mt-auto pt-1 flex items-center gap-1.5 text-xs font-medium text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                            <Wand2 className="h-3 w-3" />
                            Generate with AI
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* ── My Templates ──────────────────────────────────────── */}
              <TabsContent
                value="my-templates"
                className="flex flex-col flex-1 min-h-0 mt-0"
              >
                {loadingUserTemplates ? (
                  <div
                    role="status"
                    aria-label="Loading templates"
                    className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
                  >
                    <Loader2
                      className="h-7 w-7 animate-spin"
                      aria-hidden="true"
                    />
                    <span className="text-sm">Loading templates…</span>
                  </div>
                ) : userTemplates.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
                    <LayoutTemplate className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">No templates saved yet</p>
                    <p className="text-xs">
                      After generating content, use "Save as Template" in the
                      Composer to build your library.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    {/* Cards — scrollable */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pagedUserTemplates.map((template) => (
                          <div
                            key={template.id}
                            className={cn(
                              "group relative flex flex-col gap-2 rounded-xl border bg-card p-4 transition-all",
                              "hover:border-primary/60 hover:bg-muted/40 hover:shadow-sm"
                            )}
                          >
                            {/* Delete — always visible on mobile, hover-only on desktop */}
                            <Button
                              variant="destructive"
                              size="icon"
                              className={cn(
                                "absolute top-2.5 right-2.5 h-6 w-6 transition-opacity",
                                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              )}
                              onClick={(e) => handleDelete(e, template.id)}
                              aria-label={`Delete "${template.title}" template`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>

                            {/* Title + badges (leave space for delete btn on mobile) */}
                            <div className="flex items-start gap-2 pr-8 sm:pr-0">
                              <span className="text-sm font-semibold leading-snug flex-1 min-w-0">
                                {template.title}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {template.aiMeta && (
                                  <Badge
                                    variant="default"
                                    className="gap-1 py-0 h-5 text-[10px] px-1.5"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    AI
                                  </Badge>
                                )}
                                <Badge
                                  variant="secondary"
                                  className="capitalize py-0 h-5 text-[10px] px-1.5"
                                >
                                  {template.category}
                                </Badge>
                              </div>
                            </div>

                            {/* Description */}
                            {template.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {template.description}
                              </p>
                            )}

                            {/* Content preview */}
                            <div className="rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground line-clamp-2 font-mono leading-relaxed">
                              {template.content[0]}
                            </div>

                            {/* Action buttons */}
                            <div className="mt-1 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-7 text-xs gap-1.5"
                                onClick={() => handleUserTemplateSelect(template)}
                                aria-label={`Use "${template.title}" template`}
                              >
                                Use template
                              </Button>
                              {template.aiMeta && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1 h-7 text-xs gap-1.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUserTemplateRegenerate(template);
                                  }}
                                  aria-label={`Re-generate "${template.title}" with AI`}
                                >
                                  <Sparkles className="h-3 w-3 text-primary" />
                                  Re-generate
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagination */}
                    {userTemplatesPageCount > 1 && (
                      <div className="flex items-center justify-between shrink-0 border-t px-6 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8"
                          onClick={() =>
                            setUserTemplatesPage((p) => Math.max(0, p - 1))
                          }
                          disabled={userTemplatesPage === 0}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Page {userTemplatesPage + 1} of {userTemplatesPageCount}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8"
                          onClick={() =>
                            setUserTemplatesPage((p) =>
                              Math.min(userTemplatesPageCount - 1, p + 1)
                            )
                          }
                          disabled={userTemplatesPage >= userTemplatesPageCount - 1}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
