"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Copy, Calendar, ExternalLink, Loader2, Package, RefreshCw } from "lucide-react";
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
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/affiliate");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSchedule = (link: AffiliateLink) => {
    if (!link.generatedTweet) return;
    
    // Use short link if available
    const urlToPost = link.shortCode 
        ? `${window.location.origin}/go/${link.shortCode}` 
        : link.destinationUrl;

    const draftContent = link.generatedTweet + "\n\n" + urlToPost;
    localStorage.setItem("composer_draft", draftContent);
    if (link.productImageUrl) {
        localStorage.setItem("composer_media", link.productImageUrl);
    }
    
    router.push("/dashboard/compose?source=affiliate");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Generations</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <div role="status" aria-label="Loading recent generations">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Loading recent generations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Generations</CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchLinks}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold">No affiliate links yet</h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Generate your first affiliate tweet above to start tracking clicks and conversions.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead className="hidden md:table-cell">Generated Content</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="flex items-center gap-3">
                      {link.productImageUrl && (
                        <Image
                          src={link.productImageUrl}
                          alt="Product thumbnail"
                          width={40}
                          height={40}
                          className="rounded object-cover border"
                          unoptimized
                        />
                      )}
                      <div className="truncate">
                        <div className="truncate font-semibold" title={link.productTitle || "Unknown"}>
                          {link.productTitle || "Unknown Product"}
                        </div>
                        <a 
                          href={link.destinationUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                        >
                          View Product <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{link.platform || "Amazon"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{link.clicks || 0}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[300px]">
                    <div className="truncate text-sm text-muted-foreground" title={link.generatedTweet || ""}>
                      {link.generatedTweet}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(link.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {link.wasScheduled ? (
                      <Badge variant="default" className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200">
                        Scheduled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Generated</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCopy(link.generatedTweet || "")}
                        title="Copy Tweet"
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
                        <span className="hidden sm:inline">Schedule</span>
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
