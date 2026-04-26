"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkImportDialogProps {
  xAccounts: { id: string; xUsername: string }[];
}

export function BulkImportDialog({ xAccounts }: BulkImportDialogProps) {
  const t = useTranslations("calendar");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>(xAccounts[0]?.id || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !selectedAccount) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("xAccountId", selectedAccount);

    try {
      const res = await fetch("/api/posts/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import");
      }

      toast.success(`Imported ${data.count} posts successfully`);
      if (data.errors) {
        toast.error(`Some rows failed: ${data.errors.length}`);
      }
      setIsOpen(false);
      setFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          {t("import_csv")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bulk_import_title")}</DialogTitle>
          <DialogDescription>{t("bulk_import_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bulk-import-account">X Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger id="bulk-import-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {xAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    @{acc.xUsername}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bulk-import-csv">CSV File</Label>
            <Input id="bulk-import-csv" type="file" accept=".csv" onChange={handleFileChange} />
          </div>
          <div className="text-muted-foreground text-xs">
            <p>Format example:</p>
            <pre className="bg-muted mt-1 rounded p-2">
              content,scheduledAt{"\n"}
              "Hello world","2023-10-01T10:00:00Z"
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || !selectedAccount || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t("importing") : t("import_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
