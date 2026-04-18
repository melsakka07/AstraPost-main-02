"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormDescription,
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
import type { SubscriberRow } from "./types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  plan: z.enum(["free", "pro_monthly", "pro_annual", "agency"]),
  isAdmin: z.boolean(),
  isSuspended: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface EditSubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriber: SubscriberRow;
  onSuccess: () => void;
}

export function EditSubscriberDialog({
  open,
  onOpenChange,
  subscriber,
  onSuccess,
}: EditSubscriberDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: subscriber.name,
      email: subscriber.email,
      plan: subscriber.plan ?? "free",
      isAdmin: subscriber.isAdmin ?? false,
      isSuspended: subscriber.isSuspended ?? false,
    },
  });

  // Reset when subscriber changes
  useEffect(() => {
    form.reset({
      name: subscriber.name,
      email: subscriber.email,
      plan: subscriber.plan ?? "free",
      isAdmin: subscriber.isAdmin ?? false,
      isSuspended: subscriber.isSuspended ?? false,
    });
  }, [subscriber, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(`${values.name} has been updated`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit subscriber</DialogTitle>
          <DialogDescription>Update {subscriber.name}'s account details.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">
                        <div className="flex flex-col">
                          <span>Free</span>
                          <span className="text-muted-foreground text-xs">
                            20 posts/mo · 1 X account · 20 AI uses
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pro_monthly">
                        <div className="flex flex-col">
                          <span>Pro Monthly</span>
                          <span className="text-muted-foreground text-xs">
                            Unlimited posts · 3 X accounts · 100 AI uses
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pro_annual">
                        <div className="flex flex-col">
                          <span>Pro Annual</span>
                          <span className="text-muted-foreground text-xs">
                            Unlimited posts · 4 X accounts · 150 AI uses
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="agency">
                        <div className="flex flex-col">
                          <span>Agency</span>
                          <span className="text-muted-foreground text-xs">
                            Unlimited everything · LinkedIn · 10 X accounts · team seats
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <div>
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Admin</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                    <FormDescription className="mt-1 text-xs">
                      Grants full access to the /admin panel — all subscribers, billing, teams, and
                      feature flags. Separate from team collaboration roles.
                    </FormDescription>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name="isSuspended"
                render={({ field }) => (
                  <div>
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Suspended</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                    <FormDescription className="mt-1 text-xs">
                      Immediately blocks login and invalidates all active sessions. The account data
                      is preserved.
                    </FormDescription>
                  </div>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
