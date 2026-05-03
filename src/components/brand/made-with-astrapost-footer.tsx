import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";

/**
 * Subtle "Made with AstraPost" footer for public-facing shared template pages.
 * Server component — no interactivity needed.
 * Place at the bottom of public shared pages (e.g. shared thread/template views).
 */
export function MadeWithAstraPostFooter() {
  return (
    <footer className="border-border/50 mt-auto border-t">
      <div className="container mx-auto flex items-center justify-center gap-1.5 px-4 py-4">
        <LogoMark size={14} className="text-muted-foreground/70" />
        <span className="text-muted-foreground text-xs">
          Made with{" "}
          <Link
            href="/"
            className="hover:text-foreground underline underline-offset-2 transition-colors"
          >
            AstraPost
          </Link>
        </span>
      </div>
    </footer>
  );
}
