"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSubscribe = async (plan: string) => {
    if (!session) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) throw new Error("Failed to start checkout");

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      description: "For individuals starting their journey on X.",
      features: [
        "1 X (Twitter) Account",
        "10 Scheduled Posts/Month",
        "Basic Analytics",
        "Manual Thread Creation",
      ],
      missing: [
        "AI Thread Writer",
        "Affiliate Generator",
        "Advanced Analytics",
        "Team Collaboration",
      ],
      buttonText: "Start for Free",
      action: () => router.push("/register"),
      popular: false,
    },
    {
      id: isAnnual ? "pro_annual" : "pro_monthly",
      name: "Pro",
      price: isAnnual ? "$23" : "$29",
      period: "/month",
      billingText: isAnnual ? "billed annually ($276)" : "billed monthly",
      description: "For creators and small businesses serious about growth.",
      features: [
        "3 X (Twitter) Accounts",
        "Unlimited Scheduled Posts",
        "AI Thread Writer (GPT-4o)",
        "Affiliate Tweet Generator",
        "Advanced Analytics",
        "Priority Support",
      ],
      missing: [
        "Team Collaboration",
        "White-label Reports",
      ],
      buttonText: "Get Pro",
      action: () => handleSubscribe(isAnnual ? "pro_annual" : "pro_monthly"),
      popular: true,
    },
    {
      id: isAnnual ? "agency_annual" : "agency_monthly",
      name: "Agency",
      price: isAnnual ? "$79" : "$99",
      period: "/month",
      billingText: isAnnual ? "billed annually ($948)" : "billed monthly",
      description: "For agencies managing multiple client accounts.",
      features: [
        "10 X (Twitter) Accounts",
        "Unlimited Scheduled Posts",
        "AI Thread Writer (GPT-4o)",
        "Affiliate Tweet Generator",
        "Team Members (Up to 5)",
        "White-label Reports",
        "Dedicated Account Manager",
      ],
      missing: [],
      buttonText: "Subscribe Agency",
      action: () => handleSubscribe(isAnnual ? "agency_annual" : "agency_monthly"),
      popular: false,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-20 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that fits your needs. No hidden fees. Cancel anytime.
        </p>
        
        <div className="flex items-center justify-center space-x-4 pt-4">
          <Label htmlFor="annual-billing" className={!isAnnual ? "font-bold" : "text-muted-foreground"}>Monthly</Label>
          <Switch id="annual-billing" checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label htmlFor="annual-billing" className={isAnnual ? "font-bold" : "text-muted-foreground"}>
            Annual <span className="text-primary text-xs ml-1 font-normal">(Save 20%)</span>
          </Label>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <div 
            key={index} 
            className={`relative flex flex-col p-8 bg-card border rounded-2xl ${
              plan.popular ? "border-primary shadow-lg scale-105 z-10" : "shadow-sm"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{plan.description}</p>
              <div className="mt-6 flex flex-col">
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                {plan.billingText && <span className="text-xs text-muted-foreground mt-1">{plan.billingText}</span>}
              </div>
            </div>

            <ul className="flex-1 space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-primary mr-2 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
              {plan.missing.map((feature, i) => (
                <li key={i} className="flex items-start text-sm text-muted-foreground/50">
                  <X className="h-5 w-5 mr-2 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full" 
              variant={plan.popular ? "default" : "outline"}
              onClick={plan.action}
              disabled={loadingPlan === plan.id}
            >
              {loadingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {plan.buttonText}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>Need annual billing? <a href="#" className="underline hover:text-foreground">Contact sales</a> for 20% off.</p>
      </div>
    </div>
  );
}
