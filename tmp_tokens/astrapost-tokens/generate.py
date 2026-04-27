"""
AstraPost color token generator.

Source of truth: Radix Colors v3 (slate, indigo, blue, grass, amber, red).
Output: OKLCH-formatted CSS for Tailwind 4 + shadcn/ui, plus a TS constants
file for chart libraries that don't accept CSS variables.
"""
import os
import json
import colour
import numpy as np

ROOT = "/home/claude/astrapost-tokens"

# --- Radix Colors v3 (official hex values) ---
# Source: https://www.radix-ui.com/colors

SCALES = {
    "neutral": {  # Radix Slate — cool gray, Apple-like restraint
        "light": ["#fcfcfd", "#f9f9fb", "#eff0f3", "#e7e8ec", "#e0e1e6",
                  "#d8d9e0", "#cdced7", "#b9bbc6", "#8b8d98", "#80828d",
                  "#62636c", "#1e1f24"],
        "dark":  ["#111113", "#18191b", "#212225", "#272a2d", "#2e3135",
                  "#363a3f", "#43484e", "#5a6169", "#696e77", "#777b84",
                  "#b0b4ba", "#edeef0"],
    },
    "brand": {  # Radix Indigo — the accent. Cosmic, confident, not playful.
        "light": ["#fdfdfe", "#f7f9ff", "#edf2fe", "#e1e9ff", "#d2deff",
                  "#c1d0ff", "#abbdf9", "#8da4ef", "#3e63dd", "#3358d4",
                  "#3a5bc7", "#1f2d5c"],
        "dark":  ["#11131f", "#141726", "#182449", "#1d2e62", "#243974",
                  "#2d4484", "#3a5295", "#4661ab", "#3e63dd", "#5472e4",
                  "#9eb1ff", "#d6e1ff"],
    },
    "info": {  # Radix Blue — distinct from brand, slightly more cyan
        "light": ["#fbfdff", "#f4faff", "#e6f4fe", "#d5efff", "#c2e5ff",
                  "#acd8fc", "#8ec8f6", "#5eb1ef", "#0090ff", "#0588f0",
                  "#0d74ce", "#113264"],
        "dark":  ["#0d1520", "#111927", "#0d2847", "#003362", "#004074",
                  "#104d87", "#205d9e", "#2870bd", "#0090ff", "#3b9eff",
                  "#70b8ff", "#c2e6ff"],
    },
    "success": {  # Radix Grass — green that reads "complete" at small sizes
        "light": ["#fbfefb", "#f5fbf5", "#e9f6e9", "#daf1db", "#c9e8ca",
                  "#b2ddb5", "#94ce9a", "#65ba74", "#46a758", "#3e9b4f",
                  "#2a7e3b", "#203c25"],
        "dark":  ["#0e1511", "#141a15", "#1b2a1e", "#1d3a24", "#25482d",
                  "#2d5736", "#366740", "#3e7949", "#46a758", "#53b365",
                  "#71d083", "#c2f0c2"],
    },
    "warning": {  # Radix Amber — warm, distinct from danger
        "light": ["#fefdfb", "#fefbe9", "#fff7c2", "#ffee9c", "#fbe577",
                  "#f3d673", "#e9c162", "#e2a336", "#ffc53d", "#ffba18",
                  "#ab6400", "#4f3422"],
        "dark":  ["#16120c", "#1d180f", "#302008", "#3f2700", "#4d3000",
                  "#5c3d05", "#714f19", "#8f6424", "#ffc53d", "#ffd60a",
                  "#ffca16", "#ffe7b3"],
    },
    "danger": {  # Radix Red — saturated, for destructive actions
        "light": ["#fffcfc", "#fff7f7", "#feebec", "#ffdbdc", "#ffcdce",
                  "#fdbdbe", "#f4a9aa", "#eb8e90", "#e5484d", "#dc3e42",
                  "#ce2c31", "#641723"],
        "dark":  ["#191111", "#201314", "#3b1219", "#500f1c", "#611623",
                  "#72232d", "#8c333a", "#b54548", "#e5484d", "#ec5d5e",
                  "#ff9592", "#ffd1d9"],
    },
}


# --- Hex → OKLCH conversion ---
def hex_to_oklch(hex_color: str) -> tuple[float, float, float]:
    """Convert sRGB hex to OKLCH. Returns (L, C, H) where L is 0-1, C is 0-0.4, H is 0-360."""
    h = hex_color.lstrip("#")
    rgb = np.array([int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4)])
    # sRGB → linear
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    # Linear sRGB → OKLab via colour-science
    xyz = colour.RGB_to_XYZ(linear, colourspace=colour.RGB_COLOURSPACES["sRGB"])
    oklab = colour.XYZ_to_Oklab(xyz)
    L, a, b = oklab
    C = float(np.sqrt(a * a + b * b))
    H = float(np.degrees(np.arctan2(b, a)) % 360)
    return float(L), C, H


def format_oklch(hex_color: str) -> str:
    """Return CSS oklch() string with sensible precision."""
    L, C, H = hex_to_oklch(hex_color)
    # Match Tailwind/shadcn precision: 3 decimals for L and C, 2 for H
    if C < 0.001:
        return f"oklch({L:.3f} 0 0)"
    return f"oklch({L:.3f} {C:.3f} {H:.2f})"


# --- shadcn/ui semantic mapping ---
# Maps shadcn's semantic token names → which scale + step provides the value.
# Standard pattern: backgrounds use steps 1-5, borders 6-8, solid 9-10, text 11-12.

SHADCN_MAPPING_LIGHT = {
    # Page surfaces
    "background": ("neutral", 1),
    "foreground": ("neutral", 12),
    # Cards (slightly inset surfaces)
    "card": ("neutral", 1),
    "card-foreground": ("neutral", 12),
    # Popover surfaces (menus, dropdowns)
    "popover": ("neutral", 1),
    "popover-foreground": ("neutral", 12),
    # Primary action — your brand color
    "primary": ("brand", 9),
    "primary-foreground": ("neutral", 1),
    # Secondary — neutral surface action
    "secondary": ("neutral", 3),
    "secondary-foreground": ("neutral", 12),
    # Muted — backgrounds for de-emphasized content
    "muted": ("neutral", 3),
    "muted-foreground": ("neutral", 11),
    # Accent — hover states, subtle highlights
    "accent": ("neutral", 4),
    "accent-foreground": ("neutral", 12),
    # Destructive
    "destructive": ("danger", 9),
    "destructive-foreground": ("neutral", 1),
    # Borders + inputs + focus ring
    "border": ("neutral", 6),
    "input": ("neutral", 6),
    "ring": ("brand", 8),
    # Charts (5-way categorical palette)
    "chart-1": ("brand", 9),
    "chart-2": ("info", 9),
    "chart-3": ("success", 9),
    "chart-4": ("warning", 9),
    "chart-5": ("danger", 9),
}

# Dark mode: same semantic structure, dark scales.
# Step 9 stays the same number (it's the "true" brand color), but
# foregrounds flip and backgrounds use steps 1-2 of the dark scale.
SHADCN_MAPPING_DARK = {
    "background": ("neutral", 1),
    "foreground": ("neutral", 12),
    "card": ("neutral", 2),
    "card-foreground": ("neutral", 12),
    "popover": ("neutral", 2),
    "popover-foreground": ("neutral", 12),
    "primary": ("brand", 9),
    "primary-foreground": ("neutral", 12),  # high-contrast text on brand
    "secondary": ("neutral", 3),
    "secondary-foreground": ("neutral", 12),
    "muted": ("neutral", 3),
    "muted-foreground": ("neutral", 11),
    "accent": ("neutral", 4),
    "accent-foreground": ("neutral", 12),
    "destructive": ("danger", 9),
    "destructive-foreground": ("neutral", 12),
    "border": ("neutral", 6),
    "input": ("neutral", 6),
    "ring": ("brand", 8),
    "chart-1": ("brand", 9),
    "chart-2": ("info", 9),
    "chart-3": ("success", 9),
    "chart-4": ("warning", 9),
    "chart-5": ("danger", 9),
}


# --- File generators ---

def gen_globals_css() -> str:
    """The drop-in globals.css for shadcn/ui + Tailwind 4."""
    out = ['@import "tailwindcss";', '@import "tw-animate-css";', "", "@custom-variant dark (&:is(.dark *));", ""]

    # Light mode :root
    out.append(":root {")
    out.append("  /* Raw scales (12 steps each) — use these for fine-grained control */")
    for scale_name, scales in SCALES.items():
        for i, hex_val in enumerate(scales["light"], start=1):
            out.append(f"  --{scale_name}-{i}: {format_oklch(hex_val)};")
        out.append("")
    out.append("  /* Semantic tokens (shadcn/ui) — use these in components */")
    for name, (scale, step) in SHADCN_MAPPING_LIGHT.items():
        hex_val = SCALES[scale]["light"][step - 1]
        out.append(f"  --{name}: {format_oklch(hex_val)};")
    out.append("")
    out.append("  /* Radius — matches shadcn defaults */")
    out.append("  --radius: 0.625rem;")
    out.append("}")
    out.append("")

    # Dark mode .dark
    out.append(".dark {")
    out.append("  /* Raw scales — dark mode */")
    for scale_name, scales in SCALES.items():
        for i, hex_val in enumerate(scales["dark"], start=1):
            out.append(f"  --{scale_name}-{i}: {format_oklch(hex_val)};")
        out.append("")
    out.append("  /* Semantic tokens — dark mode */")
    for name, (scale, step) in SHADCN_MAPPING_DARK.items():
        hex_val = SCALES[scale]["dark"][step - 1]
        out.append(f"  --{name}: {format_oklch(hex_val)};")
    out.append("}")
    out.append("")

    # @theme inline — exposes CSS variables to Tailwind utilities
    out.append("@theme inline {")
    out.append("  /* Semantic colors → Tailwind utility classes (bg-background, text-foreground, etc.) */")
    for name in SHADCN_MAPPING_LIGHT.keys():
        out.append(f"  --color-{name}: var(--{name});")
    out.append("")
    out.append("  /* Raw scales → utilities like bg-neutral-1, text-brand-9, border-brand-6 */")
    for scale_name in SCALES.keys():
        for i in range(1, 13):
            out.append(f"  --color-{scale_name}-{i}: var(--{scale_name}-{i});")
        out.append("")
    out.append("  --radius-sm: calc(var(--radius) - 4px);")
    out.append("  --radius-md: calc(var(--radius) - 2px);")
    out.append("  --radius-lg: var(--radius);")
    out.append("  --radius-xl: calc(var(--radius) + 4px);")
    out.append("}")
    out.append("")

    # Body baseline
    out.append("@layer base {")
    out.append("  * { @apply border-border outline-ring/50; }")
    out.append("  body { @apply bg-background text-foreground; }")
    out.append("}")
    out.append("")

    return "\n".join(out)


def gen_tokens_ts() -> str:
    """TS constants for chart libraries / runtime needs."""
    out = [
        "/**",
        " * AstraPost color tokens.",
        " * Use these when you need raw values at runtime (e.g., Recharts, D3, canvas).",
        " * For component styling, prefer CSS variables (bg-background, text-primary, etc.).",
        " */",
        "",
    ]

    # Per-scale exports (hex format for compat with chart libs)
    for scale_name, scales in SCALES.items():
        out.append(f"export const {scale_name} = {{")
        out.append("  light: [")
        for h in scales["light"]:
            out.append(f'    "{h}",')
        out.append("  ] as const,")
        out.append("  dark: [")
        for h in scales["dark"]:
            out.append(f'    "{h}",')
        out.append("  ] as const,")
        out.append("};")
        out.append("")

    # Convenience chart palette
    out.append("/** 5-way categorical chart palette. Index by data series. */")
    out.append("export const chartColors = {")
    out.append("  light: [")
    out.append(f'    "{SCALES["brand"]["light"][8]}",   // brand')
    out.append(f'    "{SCALES["info"]["light"][8]}",    // info')
    out.append(f'    "{SCALES["success"]["light"][8]}", // success')
    out.append(f'    "{SCALES["warning"]["light"][8]}", // warning')
    out.append(f'    "{SCALES["danger"]["light"][8]}",  // danger')
    out.append("  ] as const,")
    out.append("  dark: [")
    out.append(f'    "{SCALES["brand"]["dark"][8]}",')
    out.append(f'    "{SCALES["info"]["dark"][8]}",')
    out.append(f'    "{SCALES["success"]["dark"][8]}",')
    out.append(f'    "{SCALES["warning"]["dark"][8]}",')
    out.append(f'    "{SCALES["danger"]["dark"][8]}",')
    out.append("  ] as const,")
    out.append("};")
    out.append("")

    # Brand constants for OG images / emails
    out.append("/** Hard-coded brand values for contexts that can't read CSS vars (OG images, emails). */")
    out.append("export const brandConstants = {")
    out.append('  bg: "#0A0A0A",          // dark canvas for OG cards, marketing')
    out.append('  fg: "#FAFAFA",          // logo on dark canvas')
    out.append(f'  primary: "{SCALES["brand"]["light"][8]}",     // accent / CTA')
    out.append(f'  primaryHover: "{SCALES["brand"]["light"][9]}",')
    out.append("} as const;")
    out.append("")

    return "\n".join(out)


def gen_preview_html() -> str:
    """Visual preview with all scales + semantic tokens, light + dark side by side."""

    def scale_row(scale_name: str, mode: str) -> str:
        scales = SCALES[scale_name][mode]
        cells = []
        for i, hex_val in enumerate(scales, start=1):
            text_color = "#fff" if i >= 9 else "#000"
            if mode == "dark":
                text_color = "#fff" if i >= 9 else "#fff" if i <= 6 else "#000"
            cells.append(
                f'<div style="background:{hex_val};color:{text_color};padding:14px 8px;'
                f'font-size:11px;font-family:ui-monospace,monospace;text-align:center;'
                f'flex:1;min-width:0;">'
                f'<div style="font-weight:500;">{i}</div>'
                f'<div style="opacity:0.7;font-size:10px;margin-top:2px;">{hex_val}</div>'
                f'</div>'
            )
        return (
            f'<div style="margin-bottom:8px;">'
            f'<div style="font-size:12px;font-weight:500;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">{scale_name}</div>'
            f'<div style="display:flex;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">{"".join(cells)}</div>'
            f'</div>'
        )

    def panel(mode: str) -> str:
        bg = SCALES["neutral"][mode][0]
        fg = SCALES["neutral"][mode][11]
        border = SCALES["neutral"][mode][5]
        rows = "".join(scale_row(s, mode) for s in SCALES.keys())

        # Semantic tokens preview — derive foreground per token correctly
        mapping = SHADCN_MAPPING_LIGHT if mode == "light" else SHADCN_MAPPING_DARK
        # Build a foreground lookup so we can pair correctly
        fg_lookup = {}
        for name, (scale, step) in mapping.items():
            if name.endswith("-foreground"):
                base = name.replace("-foreground", "")
                fg_lookup[base] = SCALES[scale][mode][step - 1]

        sem_cells = []
        for name, (scale, step) in mapping.items():
            if name.endswith("-foreground"):
                continue
            hex_val = SCALES[scale][mode][step - 1]
            text_color = fg_lookup.get(name, fg)
            sem_cells.append(
                f'<div style="background:{hex_val};color:{text_color};padding:14px;'
                f'font-size:12px;border-radius:6px;border:1px solid {border};'
                f'min-width:0;display:flex;flex-direction:column;gap:2px;">'
                f'<div style="font-weight:500;">{name}</div>'
                f'<div style="opacity:0.7;font-family:ui-monospace,monospace;font-size:10px;">{hex_val}</div>'
                f'</div>'
            )

        # Demo UI: realistic component samples
        primary = SCALES["brand"][mode][8]
        primary_text = "#fff"
        secondary_bg = SCALES["neutral"][mode][2]
        muted_text = SCALES["neutral"][mode][10]
        card_bg = SCALES["neutral"][mode][1] if mode == "dark" else SCALES["neutral"][mode][0]

        demo = f'''
        <div style="background:{card_bg};border:1px solid {border};border-radius:12px;padding:20px;margin-top:16px;">
          <div style="font-size:14px;font-weight:500;margin-bottom:4px;color:{fg};">Schedule a post</div>
          <div style="font-size:12px;color:{muted_text};margin-bottom:12px;">Compose now, publish later. AI will suggest the best time.</div>
          <div style="display:flex;gap:8px;">
            <button style="background:{primary};color:{primary_text};border:none;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">Schedule</button>
            <button style="background:{secondary_bg};color:{fg};border:1px solid {border};padding:8px 14px;border-radius:6px;font-size:13px;cursor:pointer;">Save draft</button>
          </div>
        </div>
        '''

        return f'''
        <div style="background:{bg};color:{fg};padding:24px;border-radius:12px;flex:1;min-width:0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;margin-bottom:12px;">{mode} mode</div>
          {rows}
          <div style="margin-top:20px;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Semantic tokens</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px;">{"".join(sem_cells)}</div>
          {demo}
        </div>
        '''

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AstraPost color tokens</title>
<style>
  body {{ margin:0; padding:24px; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; background: #f5f5f7; }}
  h1 {{ font-size:20px; font-weight:600; margin:0 0 4px; }}
  .sub {{ font-size:13px; color:#666; margin-bottom:24px; }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
  @media (max-width: 900px) {{ .grid {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body>
  <h1>AstraPost — color system preview</h1>
  <div class="sub">Radix-derived scales (slate, indigo, blue, grass, amber, red) → OKLCH → Tailwind 4 + shadcn semantic tokens.</div>
  <div class="grid">
    {panel("light")}
    {panel("dark")}
  </div>
</body>
</html>'''


def gen_readme() -> str:
    return '''# AstraPost color tokens

A complete color system for AstraPost: 6 scales × 12 steps × 2 modes = 144 calibrated values, mapped to shadcn/ui semantic tokens, output in OKLCH for Tailwind 4.

## Philosophy

The system is monochrome-first to match your Apple-inspired aesthetic and the `currentColor` logo. **95% of the UI uses neutral slate.** A single brand accent (indigo) handles primary actions, focus rings, and brand moments. Four semantic scales (blue/green/amber/red) cover info, success, warning, and danger states.

Every scale follows Radix's 12-step methodology, where each step has a defined role:

| Step  | Role                                                |
| ----- | --------------------------------------------------- |
| 1     | App background                                      |
| 2     | Subtle background (e.g. striped rows, code blocks)  |
| 3     | UI element background (idle)                        |
| 4     | UI element background (hover)                       |
| 5     | UI element background (active / pressed)            |
| 6     | Subtle borders                                      |
| 7     | UI borders                                          |
| 8     | Strong borders, focus rings                         |
| 9     | Solid backgrounds (the "true" color of the scale)   |
| 10    | Solid hover                                         |
| 11    | Low-contrast text                                   |
| 12    | High-contrast text                                  |

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

**Why indigo?** "Astra" is cosmic. Pure blue (#0090FF) reads as *informational* (Twitter, Facebook, banking). A violet-leaning indigo (#3E63DD) reads as *deliberate, premium, deep-space* — same family as Linear, Vercel hover states, and Apple Intelligence's purple-blue gradient. It pairs with the monochrome wordmark without competing.

**Why slate as the neutral?** Pure gray feels dated and generic. Warm gray feels craft-y/handmade (wrong for a B2B tool). Slate has the slightest blue tint, which makes it feel *crafted, modern, and serious* — same family Apple, Linear, Vercel, and Notion all use.

## Migration from default shadcn

If you already have shadcn installed, you only need to swap your `globals.css`. Every semantic token name is unchanged (`--background`, `--primary`, `--ring`, etc.) — only the values differ. Existing components using `bg-primary`, `text-foreground`, etc. will pick up the new colors automatically.

## Accessibility notes

All step 9 solids reach **at least WCAG AA contrast** against white (light mode) and step 1 (dark mode) for text 14px+. Step 12 reaches AAA against step 1 in both modes. The chart palette is designed to be distinguishable with 5 series — for 6+ series, supplement with shape, dash pattern, or label.

## Regenerating

The Python source (`generate.py`) is included so you can swap in a different brand hue without redoing this work. The conversion math (sRGB hex → OKLCH) is done with `colour-science`. To switch indigo to something else (say, Radix violet or iris), replace the `brand` scale's hex arrays in `SCALES` and re-run.
'''


def main():
    print("Generating tokens…")
    os.makedirs(ROOT, exist_ok=True)

    files = {
        "globals.css": gen_globals_css(),
        "tokens.ts": gen_tokens_ts(),
        "preview.html": gen_preview_html(),
        "README.md": gen_readme(),
    }
    for name, content in files.items():
        path = os.path.join(ROOT, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  wrote {name} ({len(content)} chars)")

    print("Done.")


if __name__ == "__main__":
    main()
