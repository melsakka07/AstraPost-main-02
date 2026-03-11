"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DateRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={range} onValueChange={handleRangeChange}>
      <SelectTrigger className="w-[120px] h-9">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="14d">Last 14 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );
}
