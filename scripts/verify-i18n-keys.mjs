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

const en = JSON.parse(readFileSync("src/i18n/messages/en.json", "utf8"));
const ar = JSON.parse(readFileSync("src/i18n/messages/ar.json", "utf8"));

const enKeys = extractKeys(en);
const arKeys = extractKeys(ar);

// Find top-level namespaces
const enNamespaces = Object.keys(en).sort();
const arNamespaces = Object.keys(ar).sort();

const missingInAr = enNamespaces.filter((k) => !arNamespaces.includes(k));
const missingInEn = arNamespaces.filter((k) => !enNamespaces.includes(k));

console.log("=== Top-level namespaces ===");
console.log("en.json namespaces:", enNamespaces.join(", "));
console.log("ar.json namespaces:", arNamespaces.join(", "));
if (missingInAr.length) console.log("MISSING in ar.json:", missingInAr);
if (missingInEn.length) console.log("MISSING in en.json:", missingInEn);

// Find leaf key differences
const enLeafKeys = enKeys.filter((k) => {
  const parts = k.split(".");
  let obj = en;
  for (const p of parts) {
    obj = obj?.[p];
  }
  return typeof obj === "string";
});

const arLeafKeys = arKeys.filter((k) => {
  const parts = k.split(".");
  let obj = ar;
  for (const p of parts) {
    obj = obj?.[p];
  }
  return typeof obj === "string";
});

const enSet = new Set(enLeafKeys);
const arSet = new Set(arLeafKeys);

const onlyInEn = enLeafKeys.filter((k) => !arSet.has(k));
const onlyInAr = arLeafKeys.filter((k) => !enSet.has(k));

if (onlyInEn.length > 0) {
  console.log(`\n=== Keys only in en.json (${onlyInEn.length}) ===`);
  onlyInEn.forEach((k) => console.log(`  - ${k}`));
}
if (onlyInAr.length > 0) {
  console.log(`\n=== Keys only in ar.json (${onlyInAr.length}) ===`);
  onlyInAr.forEach((k) => console.log(`  - ${k}`));
}

if (
  onlyInEn.length === 0 &&
  onlyInAr.length === 0 &&
  missingInAr.length === 0 &&
  missingInEn.length === 0
) {
  console.log("\n=== ALL KEYS MATCH! ===");
} else {
  console.log("\n=== MISMATCHES FOUND ===");
  process.exit(1);
}

console.log(`\nTotal leaf keys: en=${enLeafKeys.length}, ar=${arLeafKeys.length}`);
