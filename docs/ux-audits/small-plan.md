Drop-in placement in your AstraPost repo:
public/
favicon.ico ← from png/favicon.ico
favicon-32.png ← from png/favicon-32.png
app-icon-180.png ← apple-touch-icon
app-icon-192.png ← Android home screen
app-icon-512.png ← PWA / app stores
og-1200x630.png ← Open Graph + Twitter card
brand/ ← optional: keep raw SVG sources here for marketing pages
lockup.svg
mark.svg
...

src/components/brand/
Logo.tsx
LogoMark.tsx
index.ts
Then:
tsximport { Logo, LogoMark } from "@/components/brand";

// In your nav
<Logo height={32} className="text-zinc-900 dark:text-zinc-50" />

// In a collapsed sidebar or X profile placeholder
<LogoMark size={24} className="text-foreground" />

// In Arabic locale (next-intl)
<Logo variant="auto" /> // switches based on <html dir>
