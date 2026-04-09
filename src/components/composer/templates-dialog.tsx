"use client";

import { useState, useEffect } from "react";
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTemplatePrompt } from "@/lib/ai/template-prompts";
import type { TemplateAiMeta, TemplatePromptConfig } from "@/lib/ai/template-prompts";
import {
  SYSTEM_TEMPLATES,
  Template,
  fetchUserTemplates,
  deleteUserTemplate,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_CATEGORIES = ["All", "Educational", "Promotional", "Personal", "Engagement"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplatesDialogProps {
  onSelect: (tweets: string[], aiMeta?: TemplateAiMeta) => void;
  onTemplateSelect: (config: TemplatePromptConfig) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplatesDialog({ onSelect, onTemplateSelect }: TemplatesDialogProps) {
  const [open, setOpen] = useState(false);

  // User templates state
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [loadingUserTemplates, setLoadingUserTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState("system");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userTemplatesPage, setUserTemplatesPage] = useState(0);

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

  // User template with aiMeta — call onTemplateSelect to open inline panel
  const handleUserTemplateRegenerate = (template: Template) => {
    const meta = template.aiMeta;
    if (!meta) return;
    const config = getTemplatePrompt(meta.templateId);
    if (!config) {
      onSelect(template.content);
      setOpen(false);
      return;
    }
    // Phase 2: Close dialog and open inline panel with template config
    onTemplateSelect(config);
    setOpen(false);
  };

  // System template click — call onTemplateSelect to open inline panel
  const handleSystemTemplateClick = (template: Template) => {
    const config = getTemplatePrompt(template.id);
    if (!config) {
      onSelect(template.content);
      setOpen(false);
      return;
    }
    // Phase 2: Close dialog and open inline panel with template config
    onTemplateSelect(config);
    setOpen(false);
  };

  // ─── SSE streaming generation ─────────────────────────────────────────────
  // Phase 2: Removed - generation now happens in composer's handleAiRun
  // The handleGenerate function and all generation state/logic has been moved to composer.tsx
  // This dialog is now purely for browsing/selecting templates

  // ─── Derived state ──────────────────────────────────────────────────────────

  const filteredSystem =
    selectedCategory === "All"
      ? SYSTEM_TEMPLATES
      : SYSTEM_TEMPLATES.filter((t) => t.category === selectedCategory);

  const USER_TEMPLATES_PAGE_SIZE = 6;
  const userTemplatesPageCount = Math.ceil(userTemplates.length / USER_TEMPLATES_PAGE_SIZE);
  const pagedUserTemplates = userTemplates.slice(
    userTemplatesPage * USER_TEMPLATES_PAGE_SIZE,
    (userTemplatesPage + 1) * USER_TEMPLATES_PAGE_SIZE
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
        >
          <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />
          <span>Templates</span>
        </Button>
      </DialogTrigger>

      {/* Consistent sizing with other composer dialogs */}
      <DialogContent className="flex max-h-[90dvh] w-full max-w-2xl flex-col gap-0 p-0">
        {/* Phase 2: Generate view removed - generation now happens in composer's inline panel */}
        {/* ── LIST VIEW ──────────────────────────────────────────────── */}
        {/* Header */}
        <div className="shrink-0 border-b px-6 pt-6 pb-4">
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
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 px-6 pt-4">
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
          <TabsContent value="system" className="mt-0 flex min-h-0 flex-1 flex-col">
            {/* Category filter — horizontally scrollable pill row */}
            <div className="shrink-0 px-6 pt-3 pb-3">
              <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SYSTEM_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    className="h-7 shrink-0 px-3 text-xs"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Template cards grid — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredSystem.map((template) => {
                  const hasAi = Boolean(getTemplatePrompt(template.id));
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className={cn(
                        "group bg-card relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                        "hover:border-primary/60 hover:bg-muted/40 hover:shadow-sm",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                        "active:scale-[0.99]"
                      )}
                      onClick={() => handleSystemTemplateClick(template)}
                      aria-label={`Select ${template.title} template`}
                    >
                      {/* Top row — title + badges */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm leading-snug font-semibold">{template.title}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          {hasAi && (
                            <Badge variant="default" className="h-5 gap-1 px-1.5 py-0 text-[10px]">
                              <Sparkles className="h-2.5 w-2.5" />
                              AI
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 py-0 text-[10px] capitalize"
                          >
                            {template.category}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {template.description}
                      </p>

                      {/* CTA hint */}
                      <div className="text-primary mt-auto flex items-center gap-1.5 pt-1 text-xs font-medium opacity-70 transition-opacity group-hover:opacity-100">
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
          <TabsContent value="my-templates" className="mt-0 flex min-h-0 flex-1 flex-col">
            {loadingUserTemplates ? (
              <div
                role="status"
                aria-label="Loading templates"
                className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3"
              >
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                <span className="text-sm">Loading templates…</span>
              </div>
            ) : userTemplates.length === 0 ? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <LayoutTemplate className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No templates saved yet</p>
                <p className="text-xs">
                  After generating content, use "Save as Template" in the Composer to build your
                  library.
                </p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {/* Cards — scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {pagedUserTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "group bg-card relative flex flex-col gap-2 rounded-xl border p-4 transition-all",
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
                          <span className="min-w-0 flex-1 text-sm leading-snug font-semibold">
                            {template.title}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {template.aiMeta && (
                              <Badge
                                variant="default"
                                className="h-5 gap-1 px-1.5 py-0 text-[10px]"
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                AI
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 py-0 text-[10px] capitalize"
                            >
                              {template.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        {template.description && (
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {template.description}
                          </p>
                        )}

                        {/* Content preview */}
                        <div className="bg-muted/60 text-muted-foreground line-clamp-2 rounded-md px-2.5 py-2 font-mono text-xs leading-relaxed">
                          {template.content[0]}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-1 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 flex-1 gap-1.5 text-xs"
                            onClick={() => handleUserTemplateSelect(template)}
                            aria-label={`Use "${template.title}" template`}
                          >
                            Use template
                          </Button>
                          {template.aiMeta && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 flex-1 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserTemplateRegenerate(template);
                              }}
                              aria-label={`Re-generate "${template.title}" with AI`}
                            >
                              <Sparkles className="text-primary h-3 w-3" />
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
                  <div className="flex shrink-0 items-center justify-between border-t px-6 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setUserTemplatesPage((p) => Math.max(0, p - 1))}
                      disabled={userTemplatesPage === 0}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      Page {userTemplatesPage + 1} of {userTemplatesPageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        setUserTemplatesPage((p) => Math.min(userTemplatesPageCount - 1, p + 1))
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
      </DialogContent>
    </Dialog>
  );
}
