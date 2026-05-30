"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const schema = z.object({
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

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: string;
  validFrom: string | null;
  validTo: string | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  applicablePlans: string[];
  isActive: boolean;
}

interface EditPromoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promo: PromoCode | null;
  onSuccess: () => void;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function EditPromoDialog({ open, onOpenChange, promo, onSuccess }: EditPromoDialogProps) {
  const t = useTranslations();

  const PLANS = [
    { value: "pro_monthly", label: t("admin.plans.proMonthly") },
    { value: "pro_annual", label: t("admin.plans.proAnnual") },
    { value: "agency", label: t("admin.plans.agency") },
  ] as const;

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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

  useEffect(() => {
    if (promo) {
      form.reset({
        description: promo.description ?? "",
        discountType: promo.discountType,
        discountValue: parseFloat(promo.discountValue),
        validFrom: toDatetimeLocal(promo.validFrom),
        validTo: toDatetimeLocal(promo.validTo),
        maxRedemptions: promo.maxRedemptions,
        applicablePlans: promo.applicablePlans ?? [],
        isActive: promo.isActive,
      });
    }
  }, [promo, form]);

  const onSubmit = async (values: FormValues) => {
    if (!promo) return;
    try {
      const res = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          validFrom: values.validFrom ? new Date(values.validFrom).toISOString() : null,
          validTo: values.validTo ? new Date(values.validTo).toISOString() : null,
          maxRedemptions: values.maxRedemptions ?? null,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(t("admin.billing.promoUpdated", { code: promo.code }));
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.billing.promoUpdateError"));
    }
  };

  const discountType = form.watch("discountType");
  const selectedPlans = form.watch("applicablePlans");

  const togglePlan = (plan: string) => {
    const current = form.getValues("applicablePlans");
    if (current.includes(plan)) {
      form.setValue(
        "applicablePlans",
        current.filter((p) => p !== plan)
      );
    } else {
      form.setValue("applicablePlans", [...current, plan]);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!form.formState.isSubmitting) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("admin.billing.editPromoTitle", { code: promo?.code ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("admin.billing.editPromoNote")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.billing.discountTypeLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">
                          {t("admin.billing.discountType.percentage")}
                        </SelectItem>
                        <SelectItem value="fixed">
                          {t("admin.billing.discountType.fixed")}
                        </SelectItem>
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
                    <FormLabel>
                      {t("admin.billing.valueLabel")}{" "}
                      {discountType === "percentage" ? "(%)" : "($)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        max={discountType === "percentage" ? "100" : "100000"}
                        step="0.01"
                        disabled
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("admin.billing.descriptionLabel")}{" "}
                    <span className="text-muted-foreground">({t("admin.common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("admin.billing.descriptionPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("admin.billing.validFromLabel")}{" "}
                      <span className="text-muted-foreground">({t("admin.common.optional")})</span>
                    </FormLabel>
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
                    <FormLabel>
                      {t("admin.billing.validToLabel")}{" "}
                      <span className="text-muted-foreground">({t("admin.common.optional")})</span>
                    </FormLabel>
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
                  <FormLabel>
                    {t("admin.billing.maxRedemptionsLabel")}{" "}
                    <span className="text-muted-foreground">
                      ({t("admin.billing.unlimitedHint")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder={t("admin.billing.unlimitedPlaceholder")}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>
                {t("admin.billing.applicablePlansLabel")}{" "}
                <span className="text-muted-foreground">({t("admin.billing.allPlansHint")})</span>
              </FormLabel>
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

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="cursor-pointer">
                      {t("admin.billing.activeLabel")}
                    </FormLabel>
                    <p className="text-muted-foreground text-xs">
                      {t("admin.billing.inactiveWarning")}
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                {t("admin.common.cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t("admin.common.saving")
                  : t("admin.common.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
