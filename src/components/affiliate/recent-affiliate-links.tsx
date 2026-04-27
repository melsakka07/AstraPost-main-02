"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Copy, Calendar, ExternalLink, Loader2, Package, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sendToComposer } from "@/lib/composer-bridge";

interface AffiliateLink {
  id: string;
  productTitle: string | null;
  productImageUrl: string | null;
  destinationUrl: string;
  shortCode: string | null;
  platform: string;
  clicks: number;
  generatedTweet: string | null;
  wasScheduled: boolean;
  createdAt: string;
}

export function RecentAffiliateLinks() {
  const t = useTranslations("affiliate");
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/affiliate");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch {
      toast.error(t("toasts.history_failed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("toasts.copied"));
  };

  const handleSchedule = (link: AffiliateLink) => {
    if (!link.generatedTweet) return;

    const urlToPost = link.shortCode
      ? `${window.location.origin}/go/${link.shortCode}`
      : link.destinationUrl;

    const text = `${link.generatedTweet}\n\n${urlToPost}`;
    sendToComposer([text], { source: "affiliate" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("recent_generations")}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <div role="status" aria-label={t("loading")}>
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" aria-hidden="true" />
            <span className="sr-only">{t("loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("recent_generations")}</CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchLinks}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("refresh")}
        </Button>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <Package className="text-muted-foreground/50 h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold">{t("no_links_title")}</h3>
            <p className="text-muted-foreground mt-1 max-w-xs text-xs">
              {t("no_links_description")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead>{t("table.platform")}</TableHead>
                <TableHead>{t("table.clicks")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("table.generated_content")}
                </TableHead>
                <TableHead>{t("table.date")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="max-w-[200px] font-medium">
                    <div className="flex items-center gap-3">
                      {link.productImageUrl && (
                        <Image
                          src={link.productImageUrl}
                          alt={t("table.product_thumbnail")}
                          width={40}
                          height={40}
                          className="rounded border object-cover"
                          unoptimized
                        />
                      )}
                      <div className="truncate">
                        <div
                          className="truncate font-semibold"
                          title={link.productTitle || t("table.unknown")}
                        >
                          {link.productTitle || t("table.unknown_product")}
                        </div>
                        <a
                          href={link.destinationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                        >
                          {t("table.view_product")} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {link.platform || t("platforms.amazon")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{link.clicks || 0}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-[300px] md:table-cell">
                    <div
                      className="text-muted-foreground truncate text-sm"
                      title={link.generatedTweet || ""}
                    >
                      {link.generatedTweet}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(link.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {link.wasScheduled ? (
                      <Badge
                        variant="default"
                        className="border-green-200 bg-green-500/15 text-green-700 hover:bg-green-500/25"
                      >
                        {t("table.scheduled")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("table.generated")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(link.generatedTweet || "")}
                        title={t("table.copy_tweet")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSchedule(link)}
                        className="gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("table.schedule")}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
