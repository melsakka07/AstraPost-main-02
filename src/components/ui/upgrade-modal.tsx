"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UpgradeModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useUpgradeModal = create<UpgradeModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function UpgradeModal() {
  const { isOpen, close } = useUpgradeModal();

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Unlock Pro Features
          </DialogTitle>
          <DialogDescription>
            You've hit the limits of your current plan. Upgrade to Pro to remove all restrictions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            {[
              "Unlimited AI generations",
              "Unlimited posts per month",
              "Connect up to 3 X accounts",
              "Advanced Analytics",
              "Priority Support"
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full text-lg py-6" size="lg">
            <Link href="/pricing">
              Upgrade to Pro
            </Link>
          </Button>
          <Button variant="ghost" onClick={close} className="w-full">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
