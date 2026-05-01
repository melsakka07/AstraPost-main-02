"use client";

import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

interface JobsTabsWrapperProps {
  defaultTab: string;
  children: React.ReactNode;
}

export function JobsTabsWrapper({ defaultTab, children }: JobsTabsWrapperProps) {
  const router = useRouter();

  function handleTabChange(value: string) {
    router.replace(`?tab=${value}`, { scroll: false });
  }

  return (
    <Tabs
      defaultValue={defaultTab}
      onValueChange={handleTabChange}
      className="space-y-4"
      suppressHydrationWarning
    >
      {children}
    </Tabs>
  );
}
