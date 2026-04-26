"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { LANGUAGES } from "@/lib/constants";
import type { TemplateAiMeta } from "@/lib/templates";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  aiMeta: TemplateAiMeta | null;
  isSubmitting: boolean;
  onSave: () => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  aiMeta,
  isSubmitting,
  onSave,
}: SaveTemplateDialogProps) {
  const t = useTranslations("compose");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          onTitleChange("");
          onDescriptionChange("");
          onCategoryChange("Personal");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("save_template_dialog.title")}</DialogTitle>
          <DialogDescription>{t("save_template_dialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("save_template_dialog.name_placeholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t("save_template_dialog.description_placeholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal">
                  {t("save_template_dialog.category_personal")}
                </SelectItem>
                <SelectItem value="Educational">
                  {t("save_template_dialog.category_educational")}
                </SelectItem>
                <SelectItem value="Promotional">
                  {t("save_template_dialog.category_promotional")}
                </SelectItem>
                <SelectItem value="Engagement">
                  {t("save_template_dialog.category_engagement")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {aiMeta && (
            <div className="border-primary/20 bg-primary/5 text-muted-foreground space-y-0.5 rounded-md border px-3 py-2 text-xs">
              <p className="text-foreground flex items-center gap-1 font-medium">
                <Sparkles className="text-primary h-3 w-3" />
                {t("save_template_dialog.ai_params_note")}
              </p>
              <p>
                Tone: <span className="text-foreground capitalize">{aiMeta.tone}</span>
              </p>
              <p>
                Language:{" "}
                <span className="text-foreground">
                  {LANGUAGES.find((l) => l.code === aiMeta.language)?.label ?? aiMeta.language}
                </span>
              </p>
              <p>
                Format:{" "}
                <span className="text-foreground capitalize">
                  {aiMeta.outputFormat.replace("-", " ")}
                </span>
              </p>
              <p className="text-muted-foreground/70 pt-0.5">
                {t("save_template_dialog.reuse_note")}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("label.cancel")}
          </Button>
          <Button onClick={onSave} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save_template_dialog.save_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
