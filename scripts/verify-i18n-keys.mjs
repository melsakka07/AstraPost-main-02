import { readFileSync } from "fs";

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

const en = JSON.parse(readFileSync("src/i18n/messages/en.json", "utf8"));
const ar = JSON.parse(readFileSync("src/i18n/messages/ar.json", "utf8"));
const pseudo = JSON.parse(readFileSync("src/i18n/messages/pseudo.json", "utf8"));

const enLeafKeys = leafKeys(en);
const enSet = new Set(enLeafKeys);

let hasMismatch = false;

// en is the canonical key set; every other locale must match it exactly.
for (const [name, root] of [
  ["ar.json", ar],
  ["pseudo.json", pseudo],
]) {
  const keys = leafKeys(root);
  const set = new Set(keys);
  const missing = enLeafKeys.filter((k) => !set.has(k));
  const extra = keys.filter((k) => !enSet.has(k));

  if (missing.length) {
    hasMismatch = true;
    console.log(`\n=== Keys missing in ${name} (${missing.length}) ===`);
    missing.forEach((k) => console.log(`  - ${k}`));
  }
  if (extra.length) {
    hasMismatch = true;
    console.log(`\n=== Keys only in ${name}, not in en.json (${extra.length}) ===`);
    extra.forEach((k) => console.log(`  - ${k}`));
  }
}

if (hasMismatch) {
  console.log("\n=== MISMATCHES FOUND ===");
  process.exit(1);
}

console.log("=== ALL KEYS MATCH (en = ar = pseudo) ===");
console.log(`Total leaf keys: ${enLeafKeys.length}`);
