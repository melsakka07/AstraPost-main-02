"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Twitter, PenTool, Calendar, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Connect X", icon: Twitter, description: "Connect your X (Twitter) account to get started." },
  { id: 2, title: "Compose", icon: PenTool, description: "Write your first tweet or thread." },
  { id: 3, title: "Schedule", icon: Calendar, description: "Pick a time to publish." },
  { id: 4, title: "Explore AI", icon: Rocket, description: "Discover AI-powered features." },
];

export function OnboardingWizard() {
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [checkingAccounts, setCheckingAccounts] = useState(true);
  
  // Post State
  const [tweetContent, setTweetContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 1 && step <= 4) setCurrentStep(step);
    }
    
    checkAccounts();
  }, [searchParams]);

  const checkAccounts = async () => {
    try {
      const res = await fetch("/api/x/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAccounts(false);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        // Validation: Must have at least one account
        if (accounts.length === 0) {
            toast.error("Please connect an X account first");
            setLoading(false);
            return;
        }
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Action: Create Draft
        if (!tweetContent.trim()) {
             toast.error("Please write something");
             setLoading(false);
             return;
        }
        
        const res = await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tweets: [{ content: tweetContent }],
                action: "draft",
                // targetXAccountIds: [accounts[0].id] // Optional, defaults to default account
            })
        });
        
        if (!res.ok) throw new Error("Failed to create draft");
        
        const data = await res.json();
        setCreatedPostId(data.postIds[0]); // Assuming single post
        setCurrentStep(3);

      } else if (currentStep === 3) {
         // Action: Schedule
         if (!scheduledDate) {
             toast.error("Please select a date");
             setLoading(false);
             return;
         }

         if (createdPostId) {
             const res = await fetch(`/api/posts/${createdPostId}`, {
                 method: "PATCH",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                     action: "schedule",
                     scheduledAt: new Date(scheduledDate).toISOString()
                 })
             });
             if (!res.ok) throw new Error("Failed to schedule");
         }
         setCurrentStep(4);

      } else if (currentStep === 4) {
        // Finish - use hard navigation to refresh server-side data
        await fetch("/api/user/onboarding-complete", { method: "POST" });
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Step error:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectX = async () => {
     await signIn.social({
        provider: "twitter",
        callbackURL: "/dashboard/onboarding?step=2" 
     });
  };

  if (checkingAccounts) {
      return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Welcome to AstraPost! 🚀</h1>
        <p className="text-muted-foreground text-center">Let's get you set up in just a few steps.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between items-center mb-12 relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10" />
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center bg-background px-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" :
                  isCurrent ? "border-primary text-primary" : "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "mt-2 text-sm font-medium",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="min-h-[400px] flex flex-col shadow-lg border-2">
        <CardHeader className="text-center border-b bg-muted/20">
          <CardTitle className="text-2xl">{steps[currentStep - 1]!.title}</CardTitle>
          <CardDescription>{steps[currentStep - 1]!.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
          {currentStep === 1 && (
            <div className="text-center space-y-6 max-w-sm">
              {accounts.length > 0 ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8" />
                      <div className="font-semibold">Connected as @{accounts[0].xUsername}</div>
                      <p className="text-sm">You are ready to proceed!</p>
                  </div>
              ) : (
                  <>
                    <p className="text-muted-foreground">Connect your X account to enable scheduling and analytics. We need 'write' permissions to post for you.</p>
                    <Button onClick={handleConnectX} size="lg" className="bg-black hover:bg-black/90 text-white w-full">
                        <Twitter className="mr-2 h-5 w-5 fill-white" />
                        Connect X Account
                    </Button>
                  </>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="w-full max-w-md space-y-4">
               <label className="text-sm font-medium">Draft your first tweet</label>
               <textarea 
                  value={tweetContent}
                  onChange={(e) => setTweetContent(e.target.value)}
                  className="w-full min-h-[150px] p-4 rounded-md border border-input bg-background text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="Hello World! This is my first tweet via AstraPost. 🚀"
                />
                <p className="text-xs text-muted-foreground text-right">{tweetContent.length}/280</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-6 w-full max-w-xs">
              <div className="space-y-2">
                <label className="text-sm font-medium">When should this go out?</label>
                <Input 
                    type="datetime-local" 
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                We'll automatically publish it at this time.
              </p>
            </div>
          )}

           {currentStep === 4 && (
            <div className="text-center space-y-6 max-w-lg">
              <div className="bg-primary/5 p-6 rounded-full inline-block mb-2">
                <Rocket className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">You're all set!</h3>
              <p className="text-muted-foreground">
                Your first post is scheduled. Head over to the dashboard to track its performance or create more content with our AI tools.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mt-4">
                  <div className="p-4 border rounded-md hover:bg-muted/50 transition-colors">
                      <h3 className="font-semibold flex items-center gap-2"><PenTool className="h-4 w-4" /> AI Writer</h3>
                      <p className="text-xs text-muted-foreground mt-1">Generate threads instantly.</p>
                  </div>
                  <div className="p-4 border rounded-md hover:bg-muted/50 transition-colors">
                      <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Analytics</h3>
                      <p className="text-xs text-muted-foreground mt-1">Track your growth.</p>
                  </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || loading}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading} size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === steps.length ? "Go to Dashboard" : "Next Step"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
