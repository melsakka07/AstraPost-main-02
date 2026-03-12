import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  name: string;
  description: string;
  price: string;
  interval: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  priceId: string; // The ID used for checkout (e.g. "pro_monthly")
}

interface PricingCardProps {
  plan: PricingPlan;
  currentPlan?: string;
  isLoading?: boolean;
  onSelect?: (priceId: string) => void;
  isAnnual?: boolean;
}

export function PricingCard({ plan, currentPlan, isLoading, onSelect, isAnnual }: PricingCardProps) {
  const isCurrent = currentPlan === plan.priceId || (isAnnual && currentPlan === plan.priceId.replace("_monthly", "_annual"));
  // Simple check for "pro" vs "pro_monthly" if needed, but here we expect precise IDs or normalized
  
  // Actually, database stores "pro_monthly" or "agency".
  // If user is on "pro_monthly", and views annual, we might want to show "Switch to Annual"
  
  return (
    <Card className={cn(
      "flex flex-col relative", 
      plan.popular ? "border-primary shadow-lg scale-105 z-10" : "border-border",
      "transition-all duration-200 hover:shadow-md"
    )}>
      {plan.popular && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 flex-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">/{plan.interval}</span>
        </div>
        <div className="space-y-2 text-sm">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          variant={plan.popular ? "default" : "outline"}
          disabled={isLoading || isCurrent}
          onClick={() => onSelect?.(plan.priceId)}
        >
          {isCurrent ? "Current Plan" : plan.actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
