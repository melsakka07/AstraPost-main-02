/**
 * HeroMockup — decorative dashboard UI preview for the landing page hero.
 * Pure Server Component — no interactivity, no "use client" needed.
 * Renders a browser-framed skeleton dashboard: sidebar + stats + chart + queue.
 */

const SIDEBAR_ITEMS = [
  { width: 48, active: false },
  { width: 60, active: true },
  { width: 44, active: false },
  { width: 52, active: false },
  { width: 56, active: false },
  { width: 40, active: false },
];

const CHART_BARS = [30, 52, 40, 68, 44, 78, 58, 72, 50, 85, 65, 100];

const STAT_CARDS = [
  { labelW: 56, valueW: 32, trend: "green" as const },
  { labelW: 64, valueW: 40, trend: "green" as const },
  { labelW: 48, valueW: 36, trend: "green" as const },
  { labelW: 40, valueW: 28, trend: "blue" as const },
];

const QUEUE_ITEMS = [
  { contentW: "75%", metaW: "38%", badgeColor: "bg-primary/20" },
  { contentW: "52%", metaW: "44%", badgeColor: "bg-amber-500/20" },
];

export function HeroMockup() {
  return (
    <div
      role="img"
      aria-label="AstraPost dashboard preview"
      className="relative mx-auto mt-14 max-w-5xl px-4 sm:px-6"
    >
      {/* Ambient glow — scale-105 so it softly bleeds past the chrome edges */}
      <div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute inset-0 -z-10 scale-105 rounded-2xl bg-gradient-to-r via-purple-500/8 to-pink-500/10 blur-2xl"
      />

      {/* Browser chrome */}
      <div className="border-border/60 overflow-hidden rounded-xl border shadow-2xl shadow-black/5 dark:shadow-black/30">
        {/* Title bar */}
        <div className="border-border/60 bg-muted/60 flex items-center gap-3 border-b px-4 py-2.5">
          {/* Traffic lights */}
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-red-400/60" />
            <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
            <span className="h-3 w-3 rounded-full bg-green-400/60" />
          </div>

          {/* URL bar */}
          <div className="border-border/40 bg-background/70 mx-auto flex max-w-xs flex-1 items-center gap-1.5 rounded-md border px-3 py-1">
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500/60"
              aria-hidden="true"
            />
            <span className="text-muted-foreground/50 truncate text-[11px]">
              app.astrapost.com/dashboard
            </span>
          </div>

          {/* Spacer to balance traffic lights */}
          <div className="w-12" aria-hidden="true" />
        </div>

        {/* Dashboard shell */}
        <div className="bg-background flex" style={{ height: 380 }}>
          {/* ── Sidebar ── */}
          <div
            className="border-border/50 bg-muted/20 hidden w-44 flex-shrink-0 flex-col gap-0.5 border-r p-3 sm:flex"
            aria-hidden="true"
          >
            {/* Brand row */}
            <div className="mb-3 flex items-center gap-2 px-2 py-1">
              <div className="bg-primary/70 h-5 w-5 rounded-md" />
              <div className="bg-foreground/20 h-2.5 w-14 rounded-full" />
            </div>

            {/* Nav items */}
            {SIDEBAR_ITEMS.map(({ width, active }, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
                  active ? "bg-primary/10" : ""
                }`}
              >
                <div
                  className={`h-3.5 w-3.5 flex-shrink-0 rounded ${
                    active ? "bg-primary/60" : "bg-foreground/15"
                  }`}
                />
                <div
                  className={`h-2 rounded-full ${active ? "bg-primary/50" : "bg-foreground/15"}`}
                  style={{ width }}
                />
              </div>
            ))}
          </div>

          {/* ── Main panel ── */}
          <div className="flex flex-1 flex-col overflow-hidden p-4" aria-hidden="true">
            {/* Top bar */}
            <div className="mb-4 flex items-center justify-between">
              <div className="bg-foreground/20 h-3 w-24 rounded-full" />
              <div className="bg-primary/65 h-7 w-24 rounded-lg" />
            </div>

            {/* Stat cards */}
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAT_CARDS.map(({ labelW, valueW, trend }, i) => (
                <div key={i} className="border-border/50 bg-card rounded-lg border p-3">
                  <div
                    className="bg-muted-foreground/20 mb-1.5 h-1.5 rounded-full"
                    style={{ width: labelW }}
                  />
                  <div
                    className="bg-foreground/55 mb-1 h-4 rounded-full"
                    style={{ width: valueW }}
                  />
                  <div
                    className={`h-1.5 w-6 rounded-full ${
                      trend === "green" ? "bg-green-500/40" : "bg-blue-500/35"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Analytics chart */}
            <div className="border-border/50 bg-card mb-3 rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-foreground/20 h-2 w-24 rounded-full" />
                <div className="bg-muted-foreground/15 h-2 w-14 rounded-full" />
              </div>
              <div className="flex items-end gap-1" style={{ height: 52 }}>
                {CHART_BARS.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${
                      i >= 10 ? "bg-primary/80" : i >= 6 ? "bg-primary/45" : "bg-primary/22"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Scheduled post queue */}
            <div className="border-border/50 bg-card rounded-lg border p-3">
              <div className="bg-foreground/20 mb-2 h-2 w-16 rounded-full" />
              <div className="space-y-1.5">
                {QUEUE_ITEMS.map(({ contentW, metaW, badgeColor }, i) => (
                  <div key={i} className="bg-muted/30 flex items-center gap-2.5 rounded-md p-2">
                    <div className="bg-primary/20 h-7 w-7 flex-shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div
                        className="bg-foreground/20 h-1.5 rounded-full"
                        style={{ width: contentW }}
                      />
                      <div
                        className="bg-muted-foreground/15 h-1.5 rounded-full"
                        style={{ width: metaW }}
                      />
                    </div>
                    <div className={`h-5 w-12 flex-shrink-0 rounded-full ${badgeColor}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade — masks the mockup cutoff into the page background */}
        <div
          aria-hidden="true"
          className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t to-transparent"
        />
      </div>
    </div>
  );
}
