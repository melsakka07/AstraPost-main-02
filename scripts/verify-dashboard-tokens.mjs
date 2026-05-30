import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const RAW_PALETTE_COLORS = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
];

const palettePattern = new RegExp(`\\b(?:${RAW_PALETTE_COLORS.join("|")})-\\d{2,3}\\b`, "g");

// Dirs proven free of raw palette classes and guarded against regression.
// Wave 1 seeded the dashboard dirs; Wave 7 Task A added the user-facing component
// dirs below. NOT yet covered (raw colors remain intentionally or pending a
// follow-up): components/{marketing,admin,brand,email}, src/app/(marketing) (brand
// gradients), src/lib/tokens.ts (runtime hex). Admin migration is a Task-A follow-up.
const DASHBOARD_DIRS = [
  "src/app/dashboard",
  "src/components/dashboard",
  "src/components/composer",
  "src/components/ai",
  "src/components/inspiration",
  "src/components/onboarding",
  "src/components/queue",
  "src/components/jobs",
  "src/components/affiliate",
  "src/components/settings",
  "src/components/billing",
  "src/components/ui",
  "src/components/roadmap",
];

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?|css)$/.test(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

let violations = 0;

for (const dir of DASHBOARD_DIRS) {
  let files;
  try {
    files = collectFiles(dir);
  } catch {
    continue;
  }
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.matchAll(palettePattern);
      for (const m of matches) {
        console.error(`${file}:${i + 1}  raw palette class "${m[0]}"`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} raw Tailwind palette class(es) found in dashboard directories.`);
  console.error(
    "Use semantic tokens instead: success-*, warning-*, danger-*, info-* (see globals.css)."
  );
  process.exit(1);
}

console.log("Dashboard token check passed — no raw palette classes found.");
