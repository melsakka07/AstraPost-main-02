# AstraPost color tokens

A complete color system for AstraPost: 6 scales × 12 steps × 2 modes = 144 calibrated values, mapped to shadcn/ui semantic tokens, output in OKLCH for Tailwind 4.

## Philosophy

The system is monochrome-first to match your Apple-inspired aesthetic and the `currentColor` logo. **95% of the UI uses neutral slate.** A single brand accent (indigo) handles primary actions, focus rings, and brand moments. Four semantic scales (blue/green/amber/red) cover info, success, warning, and danger states.

Every scale follows Radix's 12-step methodology, where each step has a defined role:

| Step | Role                                               |
| ---- | -------------------------------------------------- |
| 1    | App background                                     |
| 2    | Subtle background (e.g. striped rows, code blocks) |
| 3    | UI element background (idle)                       |
| 4    | UI element background (hover)                      |
| 5    | UI element background (active / pressed)           |
| 6    | Subtle borders                                     |
| 7    | UI borders                                         |
| 8    | Strong borders, focus rings                        |
| 9    | Solid backgrounds (the "true" color of the scale)  |
| 10   | Solid hover                                        |
| 11   | Low-contrast text                                  |
| 12   | High-contrast text                                 |

This means you never have to wonder which gray to use — pick by intent, not by eye.

## Files

```
astrapost-tokens/
├── globals.css      Drop-in replacement for shadcn's globals.css. All variables.
├── tokens.ts        TS constants for runtime use (charts, OG generation, emails)
├── preview.html     Visual preview — open in a browser to see every token
└── README.md
```

## Installing

Replace your `app/globals.css` with the supplied file (or merge into your existing one — the structure follows shadcn/ui v4 conventions exactly).

If you're missing the animation utility import:

```sh
pnpm add tw-animate-css
```

That's the only dependency. Tailwind 4 reads everything from CSS — no config file changes needed.

## Using the tokens

### Semantic tokens (preferred — use in 95% of components)

```tsx
<div className="bg-background text-foreground">
  <Card className="bg-card border-border">
    <Button className="bg-primary text-primary-foreground">Schedule</Button>
    <Button variant="outline" className="bg-secondary text-secondary-foreground">
      Save draft
    </Button>
    <p className="text-muted-foreground">AI will suggest the best time.</p>
  </Card>
</div>
```

These automatically swap between light and dark mode via the `.dark` class on `<html>`.

### Raw scale tokens (for fine-grained control)

```tsx
// Need a hover state slightly darker than --primary?
<Button className="bg-brand-9 hover:bg-brand-10">Schedule</Button>

// Need a soft tinted background that's not pure neutral?
<div className="bg-brand-2 border border-brand-6">
  AI suggestion
</div>

// Status indicator for "post failed"
<Badge className="bg-danger-3 text-danger-11 border-danger-6">Failed</Badge>
```

The 6 scales are: `neutral`, `brand`, `info`, `success`, `warning`, `danger`.

### Runtime values (charts, OG images, transactional emails)

```ts
import { chartColors, brandConstants } from "@/lib/tokens";

// Recharts
<Line stroke={chartColors.light[0]} />  // brand
<Line stroke={chartColors.light[1]} />  // info

// OG image generation (next/og)
<div style={{ background: brandConstants.bg, color: brandConstants.fg }}>
  <Logo />
</div>
```

## Brand color philosophy

**Why indigo?** "Astra" is cosmic. Pure blue (#0090FF) reads as _informational_ (Twitter, Facebook, banking). A violet-leaning indigo (#3E63DD) reads as _deliberate, premium, deep-space_ — same family as Linear, Vercel hover states, and Apple Intelligence's purple-blue gradient. It pairs with the monochrome wordmark without competing.

**Why slate as the neutral?** Pure gray feels dated and generic. Warm gray feels craft-y/handmade (wrong for a B2B tool). Slate has the slightest blue tint, which makes it feel _crafted, modern, and serious_ — same family Apple, Linear, Vercel, and Notion all use.

## Migration from default shadcn

If you already have shadcn installed, you only need to swap your `globals.css`. Every semantic token name is unchanged (`--background`, `--primary`, `--ring`, etc.) — only the values differ. Existing components using `bg-primary`, `text-foreground`, etc. will pick up the new colors automatically.

## Accessibility notes

All step 9 solids reach **at least WCAG AA contrast** against white (light mode) and step 1 (dark mode) for text 14px+. Step 12 reaches AAA against step 1 in both modes. The chart palette is designed to be distinguishable with 5 series — for 6+ series, supplement with shape, dash pattern, or label.

## Regenerating

The Python source (`generate.py`) is included so you can swap in a different brand hue without redoing this work. The conversion math (sRGB hex → OKLCH) is done with `colour-science`. To switch indigo to something else (say, Radix violet or iris), replace the `brand` scale's hex arrays in `SCALES` and re-run.
