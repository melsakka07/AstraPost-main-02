import Link from "next/link";
import { Download } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand";
import {
  neutral,
  brand as brandScale,
  info,
  success,
  warning,
  danger,
  brandConstants,
} from "@/lib/tokens";
import { CopyButton } from "./_components/CopyButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand kit · AstraPost",
  description:
    "Logo system, color tokens, typography, and downloadable assets for the AstraPost identity.",
  robots: { index: false, follow: false }, // internal reference page
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SCALES = [
  {
    name: "neutral",
    description: "The workhorse — backgrounds, borders, and text. 95% of the UI.",
    light: neutral.light,
    dark: neutral.dark,
  },
  {
    name: "brand",
    description: "The accent — primary actions, focus rings, links, brand moments.",
    light: brandScale.light,
    dark: brandScale.dark,
  },
  {
    name: "info",
    description: "Informational states — AI suggestions, scheduled posts, neutral notices.",
    light: info.light,
    dark: info.dark,
  },
  {
    name: "success",
    description: "Successful publishes, completed tasks, healthy status.",
    light: success.light,
    dark: success.dark,
  },
  {
    name: "warning",
    description: "Quota alerts, expiring tokens, soft warnings.",
    light: warning.light,
    dark: warning.dark,
  },
  {
    name: "danger",
    description: "Destructive actions, failed publishes, errors.",
    light: danger.light,
    dark: danger.dark,
  },
] as const;

const STEP_ROLES = [
  "App background",
  "Subtle background",
  "UI element idle",
  "UI element hover",
  "UI element active",
  "Subtle border",
  "Border",
  "Strong border / focus",
  "Solid background",
  "Solid hover",
  "Low-contrast text",
  "High-contrast text",
];

const SEMANTIC_TOKENS = [
  { name: "background", description: "Page background" },
  { name: "foreground", description: "Default body text" },
  { name: "card", description: "Card and elevated surfaces" },
  { name: "popover", description: "Menus, dropdowns, tooltips" },
  { name: "primary", description: "Primary action color" },
  { name: "primary-foreground", description: "Text on --primary" },
  { name: "secondary", description: "Secondary surface color" },
  { name: "muted", description: "De-emphasized backgrounds" },
  { name: "muted-foreground", description: "De-emphasized text" },
  { name: "accent", description: "Hover states, subtle highlights" },
  { name: "destructive", description: "Destructive actions" },
  { name: "border", description: "Default borders" },
  { name: "input", description: "Form input borders" },
  { name: "ring", description: "Focus rings" },
];

const DOWNLOADS = [
  { name: "Lockup (SVG, currentColor)", path: "/brand/lockup.svg" },
  { name: "Lockup (SVG, black)", path: "/brand/lockup-black.svg" },
  { name: "Lockup (SVG, white)", path: "/brand/lockup-white.svg" },
  { name: "Mark only (SVG, currentColor)", path: "/brand/mark.svg" },
  { name: "Wordmark only (SVG, currentColor)", path: "/brand/wordmark.svg" },
  { name: "Lockup Arabic RTL (SVG, currentColor)", path: "/brand/lockup-rtl.svg" },
  { name: "Wordmark Arabic (SVG, currentColor)", path: "/brand/wordmark-arabic.svg" },
  { name: "Mark (PNG, 512px)", path: "/brand/mark-512.png" },
  { name: "App icon (PNG, 512px, dark)", path: "/app-icon-512.png" },
  { name: "App icon (PNG, 180px, iOS)", path: "/app-icon-180.png" },
  { name: "Open Graph card (PNG, 1200×630)", path: "/og-1200x630.png" },
  { name: "Favicon (ICO)", path: "/favicon.ico" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BrandKitPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <Hero />
        <TableOfContents />
        <LogoSection />
        <ColorSection />
        <TypographySection />
        <ComponentsSection />
        <DownloadsSection />
        <Footer />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Hero() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="mb-20 flex flex-col items-start">
      <LogoMark size={56} className="text-foreground mb-8" />
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">AstraPost brand kit</h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        A single source of truth for the AstraPost identity — logo system, color tokens, typography,
        and downloadable assets.
      </p>
      <div className="text-muted-foreground mt-6 text-sm">Last updated {lastUpdated}</div>
    </section>
  );
}

function TableOfContents() {
  const items = [
    { href: "#logo", label: "Logo" },
    { href: "#color", label: "Color" },
    { href: "#typography", label: "Typography" },
    { href: "#components", label: "Components" },
    { href: "#downloads", label: "Downloads" },
  ];
  return (
    <nav
      aria-label="Brand kit sections"
      className="border-border mb-20 flex flex-wrap gap-x-6 gap-y-2 border-y py-4 text-sm"
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header id={id} className="mb-10 scroll-mt-16">
      <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>
    </header>
  );
}

function LogoSection() {
  return (
    <section className="mb-24">
      <SectionHeader
        id="logo"
        eyebrow="01"
        title="Logo"
        description="A four-point sparkle paired with the AstraPost wordmark, separated by a hairline. The mark is script-agnostic and works at every size from 16px favicon to billboard."
      />

      {/* Lockup on light + dark surfaces */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <SurfacePanel mode="light">
          <Logo height={40} className="text-zinc-900" />
        </SurfacePanel>
        <SurfacePanel mode="dark">
          <Logo height={40} className="text-zinc-50" />
        </SurfacePanel>
      </div>

      {/* Mark sizes */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-medium">Mark — sizes</h3>
        <div className="border-border bg-card flex items-end gap-8 rounded-lg border p-8">
          {[16, 24, 32, 48, 96].map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <LogoMark size={size} className="text-foreground" />
              <span className="text-muted-foreground text-xs">{size}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* Arabic RTL */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-medium">
          Arabic lockup{" "}
          <span className="text-muted-foreground font-normal">
            — for <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">next-intl</code>{" "}
            RTL flows
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SurfacePanel mode="light">
            <Logo variant="rtl" height={40} className="text-zinc-900" />
          </SurfacePanel>
          <SurfacePanel mode="dark">
            <Logo variant="rtl" height={40} className="text-zinc-50" />
          </SurfacePanel>
        </div>
      </div>

      {/* Usage guidance */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GuidanceCard tone="positive" title="Do">
          <ul className="text-muted-foreground space-y-1.5 text-sm">
            <li>
              Inherit from{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">currentColor</code>{" "}
              using Tailwind text utilities.
            </li>
            <li>Use the mark alone for favicons, app icons, and tight spaces (16–32px).</li>
            <li>Maintain clear space equal to the mark&apos;s height around the lockup.</li>
            <li>Use the RTL variant in Arabic locales — never mirror the LTR version manually.</li>
          </ul>
        </GuidanceCard>
        <GuidanceCard tone="negative" title="Don't">
          <ul className="text-muted-foreground space-y-1.5 text-sm">
            <li>Don&apos;t apply gradients, shadows, or effects to the logo.</li>
            <li>
              Don&apos;t recolor the mark with anything other than monochrome (black, white, or
              theme foreground).
            </li>
            <li>Don&apos;t stretch, skew, or rotate any element of the lockup.</li>
            <li>
              Don&apos;t place the logo on busy photographic backgrounds without a solid backdrop.
            </li>
          </ul>
        </GuidanceCard>
      </div>
    </section>
  );
}

function ColorSection() {
  return (
    <section className="mb-24">
      <SectionHeader
        id="color"
        eyebrow="02"
        title="Color"
        description="Six 12-step scales in OKLCH, mapped to shadcn/ui semantic tokens. Click any swatch to copy its value."
      />

      {/* Brand canvas reference */}
      <div className="border-border bg-card mb-10 rounded-lg border p-6">
        <div className="mb-4 text-sm font-medium">Brand canvas</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <CanvasSwatch label="Brand bg" value={brandConstants.bg} foreground={brandConstants.fg} />
          <CanvasSwatch label="Brand fg" value={brandConstants.fg} foreground={brandConstants.bg} />
          <CanvasSwatch label="Primary" value={brandConstants.primary} foreground="#fff" />
          <CanvasSwatch
            label="Primary hover"
            value={brandConstants.primaryHover}
            foreground="#fff"
          />
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          Hard-coded values for contexts that can&apos;t resolve CSS variables — OG images,
          transactional emails, marketing collateral.
        </p>
      </div>

      {/* The 6 scales */}
      <div className="mb-12 space-y-8">
        {SCALES.map((scale) => (
          <ScaleRow key={scale.name} scale={scale} />
        ))}
      </div>

      {/* Step-role legend */}
      <div className="border-border bg-muted/40 mb-12 rounded-lg border p-6">
        <h3 className="mb-4 text-sm font-medium">12-step methodology</h3>
        <p className="text-muted-foreground mb-4 max-w-2xl text-sm">
          Every scale uses the same step semantics. Pick by role, not by eye.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {STEP_ROLES.map((role, i) => (
            <div key={role} className="flex items-baseline gap-3 text-sm">
              <span className="bg-background text-muted-foreground ring-border inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-medium ring-1">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Semantic tokens */}
      <div>
        <h3 className="mb-4 text-sm font-medium">Semantic tokens (shadcn/ui)</h3>
        <p className="text-muted-foreground mb-4 max-w-2xl text-sm">
          Use these in 95% of components. They auto-switch with light/dark mode.
        </p>
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Token</th>
                <th className="px-4 py-3 text-left font-medium">Tailwind utility</th>
                <th className="px-4 py-3 text-left font-medium">Use for</th>
                <th className="px-4 py-3 text-left font-medium">Live</th>
              </tr>
            </thead>
            <tbody>
              {SEMANTIC_TOKENS.map((token) => (
                <tr key={token.name} className="border-border border-t">
                  <td className="px-4 py-2.5">
                    <CopyButton value={`--${token.name}`} className="-ml-2" />
                  </td>
                  <td className="px-4 py-2.5">
                    <CopyButton
                      value={
                        token.name.includes("foreground")
                          ? `text-${token.name}`
                          : `bg-${token.name}`
                      }
                      className="-ml-2"
                    />
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5">{token.description}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="ring-border inline-block h-5 w-12 rounded ring-1 ring-inset"
                      style={{ background: `var(--${token.name})` }}
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TypographySection() {
  return (
    <section className="mb-24">
      <SectionHeader
        id="typography"
        eyebrow="03"
        title="Typography"
        description="Inter for Latin scripts, IBM Plex Sans Arabic for Arabic. Both are designed with similar geometry, so weights match across scripts."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Latin */}
        <div className="border-border bg-card rounded-lg border p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-sm font-medium">Inter</h3>
            <span className="text-muted-foreground text-xs">Latin, Latin-ext</span>
          </div>
          <div className="space-y-4 font-sans">
            <TypeSpecimen weight={400} text="Schedule a post" />
            <TypeSpecimen weight={500} text="Schedule a post" />
            <TypeSpecimen weight={600} text="Schedule a post" />
            <TypeSpecimen weight={700} text="Schedule a post" />
          </div>
        </div>

        {/* Arabic */}
        <div className="border-border bg-card rounded-lg border p-6" dir="rtl">
          <div className="mb-4 flex items-baseline justify-between" dir="ltr">
            <h3 className="text-sm font-medium">IBM Plex Sans Arabic</h3>
            <span className="text-muted-foreground text-xs">Arabic</span>
          </div>
          <div className="font-arabic space-y-4">
            <TypeSpecimen weight={400} text="جدولة منشور" />
            <TypeSpecimen weight={500} text="جدولة منشور" />
            <TypeSpecimen weight={600} text="جدولة منشور" />
            <TypeSpecimen weight={700} text="جدولة منشور" />
          </div>
        </div>
      </div>

      {/* Heading scale */}
      <div className="border-border bg-card mt-6 rounded-lg border p-6">
        <h3 className="mb-4 text-sm font-medium">Heading scale</h3>
        <div className="space-y-4">
          <HeadingSpec
            size="text-4xl md:text-5xl"
            weight="font-semibold"
            tracking="tracking-tight"
            sample="The future of social, scheduled."
            label="H1 · 36/48px · 600 · -0.02em"
          />
          <HeadingSpec
            size="text-2xl md:text-3xl"
            weight="font-semibold"
            tracking="tracking-tight"
            sample="Compose, schedule, analyze."
            label="H2 · 24/30px · 600 · -0.02em"
          />
          <HeadingSpec
            size="text-lg"
            weight="font-medium"
            tracking="tracking-normal"
            sample="Schedule a post"
            label="H3 · 18px · 500"
          />
          <HeadingSpec
            size="text-base"
            weight="font-normal"
            tracking="tracking-normal"
            sample="Compose now, publish later. AI will suggest the best time."
            label="Body · 16px · 400"
          />
          <HeadingSpec
            size="text-sm"
            weight="font-normal"
            tracking="tracking-normal"
            sample="3 posts scheduled this week"
            label="Small · 14px · 400"
          />
        </div>
      </div>
    </section>
  );
}

function ComponentsSection() {
  return (
    <section className="mb-24">
      <SectionHeader
        id="components"
        eyebrow="04"
        title="Components in use"
        description="The tokens applied to a representative slice of UI — buttons, badges, inputs, cards. This is what the system looks like in production."
      />

      <div className="border-border bg-card rounded-lg border p-8">
        {/* Card sample */}
        <div className="border-border bg-background mb-8 max-w-md rounded-lg border p-6">
          <h3 className="mb-1 text-base font-medium">Schedule a post</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Compose now, publish later. AI will suggest the best time.
          </p>
          <input
            type="text"
            placeholder="Write something..."
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring mb-3 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
            >
              Schedule
            </button>
            <button
              type="button"
              className="border-border bg-secondary text-secondary-foreground hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Save draft
            </button>
            <button
              type="button"
              className="bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
            >
              Discard
            </button>
          </div>
        </div>

        {/* Status badges */}
        <div>
          <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
            Status badges
          </h4>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="info" label="Scheduled" />
            <StatusBadge tone="success" label="Published" />
            <StatusBadge tone="warning" label="Quota low" />
            <StatusBadge tone="danger" label="Failed" />
            <StatusBadge tone="neutral" label="Draft" />
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadsSection() {
  return (
    <section className="mb-24">
      <SectionHeader
        id="downloads"
        eyebrow="05"
        title="Downloads"
        description="Every brand asset, ready to use. SVGs are font-outlined — they render identically regardless of which fonts are loaded."
      />

      <ul className="divide-border border-border divide-y overflow-hidden rounded-lg border">
        {DOWNLOADS.map((file) => (
          <li
            key={file.path}
            className="hover:bg-accent/40 flex items-center justify-between gap-4 px-4 py-3 transition-colors"
          >
            <span className="text-sm">{file.name}</span>
            <a
              href={file.path}
              download
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono">{file.path}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-border text-muted-foreground border-t pt-8 text-sm">
      <p>
        Source code for this page lives at{" "}
        <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
          src/app/brand/page.tsx
        </code>
        . Edit it freely as the system evolves —{" "}
        <Link href="/" className="text-foreground underline-offset-4 hover:underline">
          back to the app
        </Link>
        .
      </p>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Reusable building blocks
// ---------------------------------------------------------------------------

function SurfacePanel({ mode, children }: { mode: "light" | "dark"; children: React.ReactNode }) {
  const styles =
    mode === "light"
      ? "bg-zinc-50 ring-1 ring-inset ring-border"
      : "bg-zinc-950 ring-1 ring-inset ring-zinc-800";
  return (
    <div className={`flex h-32 items-center justify-center rounded-lg ${styles}`}>{children}</div>
  );
}

function GuidanceCard({
  tone,
  title,
  children,
}: {
  tone: "positive" | "negative";
  title: string;
  children: React.ReactNode;
}) {
  const dot = tone === "positive" ? "bg-success-9" : "bg-danger-9";
  return (
    <div className="border-border bg-card rounded-lg border p-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        {title}
      </div>
      {children}
    </div>
  );
}

function CanvasSwatch({
  label,
  value,
  foreground,
}: {
  label: string;
  value: string;
  foreground: string;
}) {
  return (
    <div
      className="flex h-20 flex-col justify-between rounded-md p-3"
      style={{ background: value, color: foreground }}
    >
      <span className="text-xs font-medium opacity-90">{label}</span>
      <span className="font-mono text-xs opacity-75">{value}</span>
    </div>
  );
}

function ScaleRow({
  scale,
}: {
  scale: { name: string; description: string; light: readonly string[]; dark: readonly string[] };
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium capitalize">{scale.name}</h3>
        <span className="text-muted-foreground text-sm">{scale.description}</span>
      </div>
      <div className="space-y-1">
        <ScaleStrip values={scale.light} mode="light" />
        <ScaleStrip values={scale.dark} mode="dark" />
      </div>
    </div>
  );
}

function ScaleStrip({ values, mode }: { values: readonly string[]; mode: "light" | "dark" }) {
  return (
    <div className="ring-border grid grid-cols-12 gap-px overflow-hidden rounded-md ring-1 ring-inset">
      {values.map((hex, i) => {
        const step = i + 1;
        const isLight = step <= 8;
        const textColor =
          mode === "dark" ? (step >= 9 ? "#000" : "#fff") : isLight ? "#000" : "#fff";
        return (
          <div
            key={i}
            className="flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-center"
            style={{ background: hex, color: textColor }}
            title={hex}
          >
            <span className="font-mono text-[10px] leading-none font-medium">{step}</span>
            <span className="font-mono text-[9px] leading-none opacity-80">{hex}</span>
          </div>
        );
      })}
    </div>
  );
}

function TypeSpecimen({ weight, text }: { weight: number; text: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span style={{ fontWeight: weight }} className="text-2xl">
        {text}
      </span>
      <span className="text-muted-foreground font-mono text-xs">{weight}</span>
    </div>
  );
}

function HeadingSpec({
  size,
  weight,
  tracking,
  sample,
  label,
}: {
  size: string;
  weight: string;
  tracking: string;
  sample: string;
  label: string;
}) {
  return (
    <div className="border-border flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
      <div className={`${size} ${weight} ${tracking}`}>{sample}</div>
      <div className="text-muted-foreground font-mono text-xs">{label}</div>
    </div>
  );
}

function StatusBadge({
  tone,
  label,
}: {
  tone: "info" | "success" | "warning" | "danger" | "neutral";
  label: string;
}) {
  const classes = {
    info: "bg-info-3 text-info-11 ring-info-6",
    success: "bg-success-3 text-success-11 ring-success-6",
    warning: "bg-warning-3 text-warning-11 ring-warning-6",
    danger: "bg-danger-3 text-danger-11 ring-danger-6",
    neutral: "bg-neutral-3 text-neutral-11 ring-neutral-6",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {label}
    </span>
  );
}
