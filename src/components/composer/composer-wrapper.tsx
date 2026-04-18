"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Composer = dynamic(
  () => import("@/components/composer/composer").then((mod) => mod.Composer),
  {
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
);

export function ComposerWrapper() {
  return <Composer />;
}
