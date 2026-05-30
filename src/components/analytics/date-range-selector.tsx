"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DateRangeSelector() {
  const t = useTranslations("analytics");
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
      <SelectTrigger className="h-9 w-[120px]">
        <SelectValue placeholder={t("date_range.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">{t("date_range.last_7d")}</SelectItem>
        <SelectItem value="14d">{t("date_range.last_14d")}</SelectItem>
        <SelectItem value="30d">{t("date_range.last_30d")}</SelectItem>
        <SelectItem value="90d">{t("date_range.last_90d")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
