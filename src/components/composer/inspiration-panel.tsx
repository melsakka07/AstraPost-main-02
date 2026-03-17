"use client";

import { useState } from "react";
import { Lightbulb, Loader2, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

interface InspirationPanelProps {
  onSelect: (topic: string) => void;
  language: string;
}

const NICHES = [
  "Technology", "Business", "Marketing", "Lifestyle", "Health & Fitness", 
  "Education", "Finance", "Entertainment", "Productivity", "Self Improvement"
];

export function InspirationPanel({ onSelect, language }: InspirationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [niche, setNiche] = useState("Technology");
  const [topics, setTopics] = useState<Array<{ topic: string; hook: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { openWithContext } = useUpgradeModal();

  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/inspiration?niche=${niche}&language=${language}`);
      if (res.status === 402) {
        openWithContext({ feature: "ai_writer" });
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTopics(data.topics);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Inspiration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Content Inspiration
          </DialogTitle>
          <DialogDescription>
            Get trending topic ideas and viral hooks for your niche.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-end gap-2">
            <div className="space-y-2 flex-1">
              <Label>Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFetch} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {topics.length > 0 ? "Refresh" : "Get Ideas"}
            </Button>
          </div>

          <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-1">
            {topics.map((t, i) => (
              <div 
                key={i} 
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => {
                  onSelect(t.topic);
                  setIsOpen(false);
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm mb-1">{t.topic}</h4>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:scale-x-[-1]" />
                </div>
                <p className="text-xs text-muted-foreground italic">"{t.hook}"</p>
              </div>
            ))}
            {topics.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Select a niche and click "Get Ideas" to start.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
