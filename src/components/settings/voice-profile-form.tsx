"use client";

import { useState, useEffect } from "react";
import { Mic, Trash2, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

interface VoiceProfile {
  tone: string;
  styleKeywords: string[];
  emojiUsage: string;
  sentenceStructure: string;
  vocabularyLevel: string;
  formattingHabits: string;
  doAndDonts: string[];
}

export function VoiceProfileForm() {
  const [samples, setSamples] = useState<string[]>(["", "", ""]);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { openWithContext } = useUpgradeModal();

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
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const validSamples = samples.filter(s => s.trim().length > 10);
    if (validSamples.length < 3) {
      toast.error("Please provide at least 3 sample tweets (min 10 chars each).");
      return;
    }

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
          suggestedPlan: "pro_monthly"
        });
        return;
      }

      if (!res.ok) throw new Error("Analysis failed");
      
      const data = await res.json();
      setProfile(data);
      toast.success("Voice Profile created successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to analyze samples. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your Voice Profile? AI will revert to generic style.")) return;
    
    try {
      const res = await fetch("/api/user/voice-profile", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setProfile(null);
      setSamples(["", "", ""]);
      toast.success("Voice Profile deleted.");
    } catch (e) {
      toast.error("Failed to delete profile");
    }
  };

  const updateSample = (index: number, val: string) => {
    const newSamples = [...samples];
    newSamples[index] = val;
    setSamples(newSamples);
  };

  const addSampleField = () => {
    if (samples.length < 10) setSamples([...samples, ""]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
              <Mic className="w-5 h-5 text-primary" />
              AI Voice Profile
            </CardTitle>
            <CardDescription>
              Train the AI to write exactly like you by analyzing your best tweets.
            </CardDescription>
          </div>
          {profile && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {profile ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground">Your Voice Analysis</h3>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Profile
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">Tone:</span>
                  <p className="text-muted-foreground">{profile.tone}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Structure:</span>
                  <p className="text-muted-foreground">{profile.sentenceStructure}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Vocabulary:</span>
                  <p className="text-muted-foreground">{profile.vocabularyLevel}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Emojis:</span>
                  <p className="text-muted-foreground">{profile.emojiUsage}</p>
                </div>
              </div>

              <div className="pt-2">
                <span className="font-medium text-foreground text-sm">Key Style Rules:</span>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                  {profile.doAndDonts.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md flex items-start gap-3 text-sm text-blue-700 dark:text-blue-300">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Your Voice Profile is active! All AI-generated content (threads, hooks, rewrites) will now automatically match this style.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md flex items-start gap-3 text-sm text-amber-700 dark:text-amber-300 mb-4">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Pro Feature: Paste 3-5 of your best-performing tweets below to create your unique voice profile.</p>
            </div>

            <div className="space-y-3">
              {samples.map((sample, i) => (
                <div key={i} className="space-y-1">
                  <Label htmlFor={`sample-tweet-${i}`} className="text-xs text-muted-foreground">Sample Tweet {i + 1}</Label>
                  <Textarea
                    id={`sample-tweet-${i}`}
                    value={sample}
                    onChange={(e) => updateSample(i, e.target.value)}
                    placeholder="Paste one of your tweets here..."
                    className="min-h-[80px] resize-none"
                  />
                </div>
              ))}
            </div>
            
            {samples.length < 5 && (
              <Button variant="ghost" size="sm" onClick={addSampleField} className="w-full border border-dashed">
                + Add another sample
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      {!profile && (
        <CardFooter className="border-t pt-6 bg-muted/20">
          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full sm:w-auto">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Writing Style...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Voice Profile
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
