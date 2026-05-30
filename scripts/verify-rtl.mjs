import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

/**
 * RTL regression guard (Wave 6, Task 1). Flags physical-direction Tailwind
 * margin/padding/text-align utilities under the dashboard surfaces, which must
 * use logical properties so they flip correctly under dir="rtl" (Arabic).
 *
 * Scope mirrors verify-dashboard-tokens.mjs. We intentionally only flag the
 * high-signal, zero-false-positive utilities (ml/mr/pl/pr/text-left/text-right):
 * left-/right-/border-l|r/rounded-l|r have legitimate physical uses in this tree
 * (e.g. the sidebar mobile drawer paired with vaul's physical `direction` prop,
 * scrollbar borders, centered gradients), so they are not auto-flagged here.
 */

// Match a directional utility only at a Tailwind class boundary: start, whitespace,
// quote/backtick, or a variant colon (e.g. `sm:mr-2`, `hover:pl-4`). The negative
// lookahead on the value avoids matching component props like `pr` inside words.
const PHYSICAL_PATTERN =
  /(?:^|[\s"'`:])(?:(?:ml|mr|pl|pr)-(?:\d|\d\.\d|auto|px|\[)|text-(?:left|right)\b)/g;

const DASHBOARD_DIRS = [
  "src/app/dashboard",
  "src/components/dashboard",
  "src/components/settings",
  "src/components/drafts",
  "src/components/analytics",
  "src/components/billing",
  "src/components/affiliate",
  "src/components/community",
  "src/components/calendar",
  "src/app/profile",
  "src/app/brand",
  "src/app/chat",
  "src/components/admin",
  "src/components/onboarding",
  "src/components/inspiration",
  "src/components/queue",
  "src/components/jobs",
  "src/components/roadmap",
  "src/components/ui",
];

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(extname(entry))) {
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
      const matches = lines[i].matchAll(PHYSICAL_PATTERN);
      for (const m of matches) {
        console.error(`${file}:${i + 1}  physical-direction class "${m[0].trim()}"`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(
    `\n${violations} physical-direction utility class(es) found in dashboard directories.`
  );
  console.error(
    "Use logical properties so they flip under RTL: ms-/me- (was ml-/mr-), ps-/pe- (was pl-/pr-), text-start/text-end (was text-left/text-right)."
  );
  process.exit(1);
}

console.log(
  "Dashboard RTL check passed — no physical-direction margin/padding/text-align classes found."
);
