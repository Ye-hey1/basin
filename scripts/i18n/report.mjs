import fs from "node:fs/promises";
import path from "node:path";
import {
  defaultLocale,
  flattenLocale,
  formatKeyList,
  getValueAtKey,
  loadLocales,
  PLURAL_CATEGORIES,
  pruneLocale,
  repoRoot,
  writeJson,
} from "./shared.mjs";

const pluralForms = ["_zero", "_one", "_two", "_few", "_many", "_other"];

const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");

const { locales, reference } = await loadLocales();
const localeKeys = flattenLocale(reference.data);
const sourceFiles = await collectSourceFiles(
  path.join(repoRoot, "apps", "web", "src"),
);
const namespaces = new Set(Object.keys(reference.data));
const { staticKeys, dynamicCalls, dynamicPrefixes } = await collectUsedKeys(
  sourceFiles,
  namespaces,
);

// Keys are also consumed outside the web app: the API reads invitation email
// copy from the locale JSONs through property access, so those keys must not
// be reported as unused.
const backendFiles = [
  ...(await collectSourceFiles(path.join(repoRoot, "apps", "api", "src"))),
  ...(await collectSourceFiles(
    path.join(repoRoot, "packages", "email", "src"),
  )),
];
const backendPrefixes = await collectBackendKeyPrefixes(
  backendFiles,
  namespaces,
);
const allDynamicPrefixes = [...dynamicPrefixes, ...backendPrefixes];

const missing = new Set(
  [...staticKeys].filter((key) => !isRepresentedByLocaleKeys(key, localeKeys)),
);
const unused = new Set(
  [...localeKeys].filter(
    (key) =>
      !isLocaleKeyUsed(key, staticKeys) &&
      !allDynamicPrefixes.some((prefix) => key.startsWith(prefix)),
  ),
);

function referenceFallback(key) {
  for (const category of PLURAL_CATEGORIES) {
    const suffix = `_${category}`;
    if (!key.endsWith(suffix)) {
      continue;
    }
    const base = key.slice(0, -suffix.length);
    for (const candidate of [`${base}_other`, base, `${base}_one`]) {
      const value = getValueAtKey(reference.data, candidate);
      if (value !== undefined) {
        return value;
      }
    }
  }
  return undefined;
}

// A value byte-identical to en-US has not been translated yet. Keys added by
// `i18n:check --fix` land here, which is the only place they surface.
const untranslated = new Map();
for (const locale of locales) {
  if (locale.locale === defaultLocale) {
    continue;
  }

  // Locale-specific plural forms (_few, _many, …) are absent from en-US, so
  // they are compared against the wording their family falls back to.
  const candidates = new Set([...localeKeys, ...flattenLocale(locale.data)]);

  const pending = [...candidates].filter((key) => {
    const target = getValueAtKey(locale.data, key);
    if (typeof target !== "string") {
      return false;
    }

    const source = getValueAtKey(reference.data, key) ?? referenceFallback(key);
    return typeof source === "string" && source === target;
  });

  if (pending.length > 0) {
    untranslated.set(locale.locale, pending);
  }
}

// Heuristic for copy that went stale: an ASCII-only value that differs from
// en-US but shares most of its content words with the current en-US wording
// is usually the old reference copy, not a real translation. Translated
// sentences share almost no content words with their source, and brand names
// or placeholders have no English function words at all, so both stay below
// the threshold.
// Values below are real translations that legitimately share wording with
// en-US (proper nouns, tech terms), not stale copy.
const STALE_ALLOWLIST = new Set([
  "auth:invitation.invitationFor",
  "settings:giteaIntegration.webhookHint",
]);
const STOPWORDS =
  /\b(the|and|to|your|this|is|are|with|for|not|cannot|a|an|of|on|in|you|be|will|was|were|it|that|have|has|account|delete|confirm|email)\b/gi;
// Non-global twin for single-word tests: /g makes .test() stateful.
const STOPWORD_TEST =
  /\b(the|and|to|your|this|is|are|with|for|not|cannot|a|an|of|on|in|you|be|will|was|were|it|that|have|has|account|delete|confirm|email)\b/i;

function contentWords(value) {
  return new Set(
    (
      value
        .replace(/\{\{\w+\}\}/gu, " ")
        .toLowerCase()
        .match(/[a-z]{3,}/gu) ?? []
    ).filter((word) => !STOPWORD_TEST.test(word)),
  );
}

const stale = new Map();
for (const locale of locales) {
  if (locale.locale === defaultLocale) {
    continue;
  }

  const pending = [];
  for (const key of flattenLocale(locale.data)) {
    const value = getValueAtKey(locale.data, key);
    if (typeof value !== "string") {
      continue;
    }
    const source = getValueAtKey(reference.data, key) ?? referenceFallback(key);
    if (typeof source !== "string" || source === value) {
      continue;
    }
    if (STALE_ALLOWLIST.has(key)) {
      continue;
    }
    if (!/^[\x20-\x7E]+$/u.test(value)) {
      continue;
    }

    const stripped = value.replace(/\{\{\w+\}\}/gu, " ");
    const stopwordHits = stripped.match(STOPWORDS)?.length ?? 0;
    const localeWords = contentWords(stripped);
    const sourceWords = contentWords(source);
    const shared = [...localeWords].filter((word) => sourceWords.has(word));
    const overlap =
      shared.length / Math.max(localeWords.size, sourceWords.size, 1);

    if (stopwordHits >= 2 && overlap >= 0.4) {
      pending.push(key);
    }
  }

  if (pending.length > 0) {
    stale.set(locale.locale, pending);
  }
}

if (
  missing.size === 0 &&
  unused.size === 0 &&
  dynamicCalls.length === 0 &&
  untranslated.size === 0 &&
  stale.size === 0
) {
  console.log("i18n report is clean.");
} else {
  if (missing.size > 0) {
    console.log("Missing keys:");
    for (const key of formatKeyList(missing)) {
      console.log(`  - ${key}`);
    }
  }

  if (unused.size > 0) {
    console.log("Unused keys:");
    for (const key of formatKeyList(unused)) {
      console.log(`  - ${key}`);
    }
  }

  if (dynamicCalls.length > 0) {
    console.log("Dynamic keys:");
    for (const call of dynamicCalls) {
      console.log(`  - ${call}`);
    }
  }

  if (untranslated.size > 0) {
    console.log("Untranslated (still identical to en-US):");
    for (const [locale, keys] of [...untranslated].sort()) {
      console.log(`  ${locale}: ${keys.length}`);
      for (const key of formatKeyList(new Set(keys))) {
        console.log(`    - ${key}`);
      }
    }
  }

  if (stale.size > 0) {
    console.log("Possibly stale (ASCII values differing from en-US):");
    for (const [locale, keys] of [...stale].sort()) {
      console.log(`  ${locale}: ${keys.length}`);
      for (const key of formatKeyList(new Set(keys))) {
        console.log(`    - ${key}`);
      }
    }
  }
}

if (shouldFix) {
  if (unused.size === 0) {
    console.log("No unused keys to remove.");
  } else {
    const allowedKeys = new Set(
      [...localeKeys].filter((key) => !unused.has(key)),
    );

    for (const locale of locales) {
      const nextLocale = pruneLocale(locale.data, allowedKeys, reference.data);
      await writeJson(locale.path, nextLocale);
    }

    console.log(
      `Removed ${unused.size} unused key(s) from ${defaultLocale} and other locales.`,
    );
  }
}

if (missing.size > 0 || dynamicCalls.length > 0) {
  process.exit(1);
}

process.exit(0);

async function collectSourceFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(fullPath);
      }

      if (!/\.(ts|tsx)$/u.test(entry.name)) {
        return [];
      }

      return [fullPath];
    }),
  );

  return files.flat();
}

async function collectUsedKeys(files, knownNamespaces) {
  const staticKeys = new Set();
  const dynamicCalls = [];
  const dynamicPrefixes = [];

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");

    for (const match of source.matchAll(
      /\b(?:[\w$]+\.)?t\(\s*(['"])([^'"\\]+)\1/gu,
    )) {
      staticKeys.add(match[2]);
    }

    for (const match of source.matchAll(
      /\bi18nKey\s*=\s*(['"])([^'"\\]+)\1/gu,
    )) {
      staticKeys.add(match[2]);
    }

    // Keys are not always handed straight to t(): error-handler.ts returns them
    // as values that error-display.tsx resolves through t(variable). A real
    // namespace plus a dotted path keeps Tailwind variants, storage keys and
    // permission statements out, while still reporting an indirect key the
    // reference has not defined yet.
    for (const match of source.matchAll(
      /(['"])([a-z][\w-]*):([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)\1/gu,
    )) {
      if (knownNamespaces.has(match[2])) {
        staticKeys.add(`${match[2]}:${match[3]}`);
      }
    }

    for (const match of source.matchAll(
      /\b(?:[\w$]+\.)?t\(\s*(`[^`]*\$\{[^`]*\}`|[^'"`\s][^,\n)]*)/gu,
    )) {
      const call = match[0].trim();
      dynamicCalls.push(`${path.relative(repoRoot, file)}: ${call}`);
      const prefixMatch = call.match(/`([^`$]*)\$\{/u);
      if (prefixMatch?.[1]) {
        dynamicPrefixes.push(prefixMatch[1]);
      }
    }
  }

  return { staticKeys, dynamicCalls, dynamicPrefixes };
}

function isRepresentedByLocaleKeys(key, localeKeys) {
  if (localeKeys.has(key)) {
    return true;
  }

  return pluralForms.some((suffix) => localeKeys.has(`${key}${suffix}`));
}

function isLocaleKeyUsed(key, staticKeys) {
  if (staticKeys.has(key)) {
    return true;
  }

  const baseKey = key.replace(/_(zero|one|two|few|many|other)$/u, "");
  return baseKey !== key && staticKeys.has(baseKey);
}

// Locale JSONs consumed by the API are traversed with property access, e.g.
// `deDE.invitations.email`. Treat every multi-segment path whose root matches
// a namespace as a used-key prefix.
async function collectBackendKeyPrefixes(files, knownNamespaces) {
  const prefixes = new Set();

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");

    for (const match of source.matchAll(
      /\b([a-z][a-z0-9-]*)\.([A-Za-z][\w-]*(?:\.[\w-]+)*)/gu,
    )) {
      if (knownNamespaces.has(match[1])) {
        prefixes.add(`${match[1]}:${match[2]}`);
      }
    }
  }

  return [...prefixes];
}
