import Link from "next/link";
import { Settings } from "lucide-react";

interface ConnectXAccountEmptyProps {
  title: string;
  description?: string;
}

export function ConnectXAccountEmpty({ title, description }: ConnectXAccountEmptyProps) {
  return (
    <div className="border-border bg-muted/20 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <div className="bg-muted-foreground/10 flex h-12 w-12 items-center justify-center rounded-full">
        <Settings className="text-muted-foreground h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      <Link
        href="/dashboard/settings"
        className="text-primary hover:text-primary/80 text-sm font-medium underline underline-offset-2 transition-colors"
      >
        {title}
      </Link>
    </div>
  );
}
