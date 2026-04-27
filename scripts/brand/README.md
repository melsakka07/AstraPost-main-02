# Brand Asset Regeneration Scripts

These scripts regenerate the AstraPost brand system assets (SVGs, PNGs, favicons, OG images)
from source design parameters.

## Scripts

- **generate.py** — Regenerates SVG logo variants and all raster outputs (PNG favicons, app icons, OG image). Invoke from repo root: `python scripts/brand/generate.py`
- **preview.html** — Visual reference showing all OKLCH colour scales, semantic tokens, and brand identity in a single page. Open directly in a browser.

## Dependencies

```bash
pip install fontTools uharfbuzz cairosvg pillow brotli colour-science
```

## Outputs

- `public/brand/` — SVG logo variants
- `public/favicon*.png`, `public/app-icon-*.png`, `public/og-1200x630.png` — raster assets
