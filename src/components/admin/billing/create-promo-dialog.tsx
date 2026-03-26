"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PLANS = [
  { value: "pro_monthly", label: "Pro Monthly" },
  { value: "pro_annual", label: "Pro Annual" },
  { value: "agency", label: "Agency" },
] as const;

const schema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores"),
  description: z.string().max(500).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive("Must be a positive number").max(100_000),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  maxRedemptions: z.number().int().positive().nullable(),
  applicablePlans: z.array(z.string()),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface CreatePromoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePromoDialog({ open, onOpenChange, onSuccess }: CreatePromoDialogProps) {
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 20,
      validFrom: "",
      validTo: "",
      maxRedemptions: null,
      applicablePlans: [],
      isActive: true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          code: values.code.toUpperCase(),
          validFrom: values.validFrom || undefined,
          validTo: values.validTo || undefined,
          maxRedemptions: values.maxRedemptions ?? undefined,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(`Promo code "${values.code.toUpperCase()}" created`);
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create promo code");
    }
  };

  const discountType = form.watch("discountType");
  const selectedPlans = form.watch("applicablePlans");

  const togglePlan = (plan: string) => {
    const current = form.getValues("applicablePlans");
    if (current.includes(plan)) {
      form.setValue("applicablePlans", current.filter((p) => p !== plan));
    } else {
      form.setValue("applicablePlans", [...current, plan]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!form.formState.isSubmitting) { form.reset(); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create promo code</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="LAUNCH20"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Active</FormLabel>
                    <div className="flex h-10 items-center">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Launch week discount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value {discountType === "percentage" ? "(%)" : "($)"}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        max={discountType === "percentage" ? "100" : "100000"}
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid from <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid to <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maxRedemptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max redemptions <span className="text-muted-foreground">(leave blank for unlimited)</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Applicable plans <span className="text-muted-foreground">(leave unselected for all plans)</span></FormLabel>
              <div className="flex flex-wrap gap-2 pt-1">
                {PLANS.map((plan) => (
                  <Button
                    key={plan.value}
                    type="button"
                    size="sm"
                    variant={selectedPlans.includes(plan.value) ? "default" : "outline"}
                    onClick={() => togglePlan(plan.value)}
                  >
                    {plan.label}
                  </Button>
                ))}
              </div>
            </FormItem>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { form.reset(); onOpenChange(false); }}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
