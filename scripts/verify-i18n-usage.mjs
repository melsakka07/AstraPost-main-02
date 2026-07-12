import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const SRC_DIR = "src";
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

function extractKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function leafKeys(root) {
  return extractKeys(root).filter((k) => {
    let obj = root;
    for (const p of k.split(".")) obj = obj?.[p];
    return typeof obj === "string";
  });
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

// Matches: const t = useTranslations("ns"); / const t = useTranslations();
// const t = await getTranslations("ns"); / const t = await getTranslations();
const HOOK_DECL_RE =
  /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:"([^"]*)"|'([^']*)')?\s*\)/g;

// Matches: <var>("key") / <var>.rich("key") / <var>.markup("key")
// Captures the variable name, optional `.rich`/`.markup` suffix, and the key
// argument (only when it's a plain single/double-quoted string literal).
const CALL_RE = /\b([A-Za-z_$][\w$]*)(?:\.(rich|markup))?\(\s*(?:"([^"]*)"|'([^']*)')\s*[,)]/g;

/**
 * Very lightweight "scope" tracking: we don't do a real AST parse. Instead we
 * split the file into top-level function/component boundaries using brace
 * counting so that a `useTranslations()` alias declared in one function does
 * not leak into a sibling function. This is a heuristic, not a full parser,
 * but it matches this codebase's style (one hook alias declared near the top
 * of each function body, used only within that same function).
 */
function splitIntoScopes(content) {
  const scopes = [];
  let depth = 0;
  let scopeStart = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") {
      if (depth === 0) scopeStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        scopes.push({ start: scopeStart, end: i, text: content.slice(scopeStart, i + 1) });
      }
    }
  }
  // Fallback: if brace counting produced nothing usable (e.g. unbalanced
  // braces inside template literals/regex confuse the naive counter), treat
  // the whole file as one scope so we still scan it.
  if (scopes.length === 0) {
    scopes.push({ start: 0, end: content.length, text: content });
  }
  return scopes;
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

function scanFile(filePath, content) {
  const results = { resolved: [] };

  // Track hook declarations across the whole file with their absolute offset,
  // so we can figure out which declaration is "in scope" for a given call
  // site (the nearest preceding declaration of that variable name within the
  // same brace scope, falling back to file-level order).
  const declarations = [];
  let m;
  HOOK_DECL_RE.lastIndex = 0;
  while ((m = HOOK_DECL_RE.exec(content)) !== null) {
    const varName = m[1];
    const namespace = m[2] ?? m[3] ?? null; // null = root-level (no namespace)
    declarations.push({ varName, namespace, index: m.index });
  }

  if (declarations.length === 0) return results;

  const scopes = splitIntoScopes(content);

  // For each scope, build a map of varName -> most recent declaration visible
  // in that scope (declarations at or before the scope's own declarations,
  // restricted to ones that fall within the scope's character range, plus any
  // file-level/module-level declarations before the scope starts).
  function resolveNamespaceForCall(callIndex, varName) {
    // Find the enclosing scope for this call.
    const enclosing = scopes.find((s) => callIndex >= s.start && callIndex <= s.end);
    const rangeStart = enclosing ? enclosing.start : 0;

    // Prefer the nearest declaration of this varName that appears before the
    // call and after the enclosing scope's start (i.e. declared within this
    // function). Fall back to the nearest declaration anywhere before the
    // call in the file (covers module-level or differently-scoped patterns).
    let best = null;
    for (const decl of declarations) {
      if (decl.varName !== varName || decl.index > callIndex) continue;
      if (decl.index >= rangeStart) {
        if (!best || decl.index > best.index) best = decl;
      }
    }
    if (!best) {
      for (const decl of declarations) {
        if (decl.varName !== varName || decl.index > callIndex) continue;
        if (!best || decl.index > best.index) best = decl;
      }
    }
    return best;
  }

  CALL_RE.lastIndex = 0;
  while ((m = CALL_RE.exec(content)) !== null) {
    const varName = m[1];
    // m[2] is "rich" or "markup" when present — key extraction is identical
    // for t("key"), t.rich("key", ...) and t.markup("key", ...).
    const key = m[3] ?? m[4];
    const callIndex = m.index;

    // Skip anything that isn't actually a tracked translation-hook variable
    // call (e.g. random function calls that happen to take a string arg).
    const decl = resolveNamespaceForCall(callIndex, varName);
    if (!decl) continue;

    const resolvedPath = decl.namespace ? `${decl.namespace}.${key}` : key;
    results.resolved.push({
      file: filePath,
      line: lineNumberAt(content, callIndex),
      varName,
      resolvedPath,
    });
  }

  return results;
}

function scanDynamicSkips(content, filePath) {
  // Detect call sites on tracked variables where the key argument is NOT a
  // plain string literal (template literal or identifier) so we can report a
  // "dynamic/skipped" count. We reuse HOOK_DECL_RE to know which identifiers
  // are translation-hook variables, then look for `<var>(` or `<var>.rich(`
  // / `<var>.markup(` followed by something other than a quoted string.
  const declaredVars = new Set();
  const declRe = new RegExp(HOOK_DECL_RE.source, "g");
  let m;
  while ((m = declRe.exec(content)) !== null) {
    declaredVars.add(m[1]);
  }
  if (declaredVars.size === 0) return [];

  const dynamicSkips = [];
  const callStartRe = /\b([A-Za-z_$][\w$]*)(?:\.(rich|markup))?\(/g;
  while ((m = callStartRe.exec(content)) !== null) {
    const varName = m[1];
    if (!declaredVars.has(varName)) continue;

    const afterParen = content.slice(m.index + m[0].length).trimStart();
    // A plain string literal argument starts with a quote — that case is
    // already handled by CALL_RE as a resolvable call. Here we only flag
    // cases where the first argument is clearly dynamic: a template literal
    // (backtick) or a bare identifier/expression (not a quote).
    const isStringLiteral = afterParen.startsWith('"') || afterParen.startsWith("'");
    const isTemplateLiteral = afterParen.startsWith("`");
    const isLikelyIdentifierArg = /^[A-Za-z_$]/.test(afterParen);

    if (isStringLiteral) continue; // handled by CALL_RE
    if (isTemplateLiteral || isLikelyIdentifierArg) {
      dynamicSkips.push({ file: filePath, line: lineNumberAt(content, m.index), varName });
    }
  }
  return dynamicSkips;
}

// --- Load and flatten en.json (canonical key set) ---
const en = JSON.parse(readFileSync("src/i18n/messages/en.json", "utf8"));
const enKeySet = new Set(leafKeys(en));

// --- Scan source files ---
const files = walk(SRC_DIR);

let totalScanned = 0;
let totalResolved = 0;
let totalDynamic = 0;
const failures = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!/useTranslations|getTranslations/.test(content)) continue;

  const relPath = file.split(/[/\\]/).join("/");
  const { resolved } = scanFile(relPath, content);

  for (const call of resolved) {
    totalScanned++;
    totalResolved++;
    if (!enKeySet.has(call.resolvedPath)) {
      totalResolved--;
      failures.push(call);
    }
  }

  const dynamicSkips = scanDynamicSkips(content, relPath);
  totalDynamic += dynamicSkips.length;
  totalScanned += dynamicSkips.length;
}

console.log("=== i18n Usage Verification ===");
console.log(
  `Files scanned (containing useTranslations/getTranslations): source tree under ${SRC_DIR}/`
);
console.log(`Total call sites scanned: ${totalScanned}`);
console.log(`Resolved successfully: ${totalResolved}`);
console.log(`Skipped (dynamic/unresolvable key): ${totalDynamic}`);
console.log(`Failed (missing key in en.json): ${failures.length}`);

if (failures.length > 0) {
  console.log(`\n=== Unresolved call sites (${failures.length}) ===`);
  for (const f of failures) {
    console.log(
      `  ${f.file}:${f.line}  ${f.varName}("...") -> "${f.resolvedPath}" not found in en.json`
    );
  }
  console.log("\n=== FAILURES FOUND ===");
  process.exit(1);
}

console.log("\n=== ALL CALL SITES RESOLVE TO EXISTING KEYS ===");
