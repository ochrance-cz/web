import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export type Locale = 'cs' | 'en';

/**
 * Parse a Hugo i18n TOML file of the shape:
 *   [key]
 *   other = "value"
 * into a flat { key: value } map.
 */
function parseHugoI18n(path: string): Record<string, string> {
  const map: Record<string, string> = {};
  let raw = '';
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return map;
  }
  let current: string | null = null;
  for (const line of raw.split('\n')) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (section) {
      current = section[1];
      continue;
    }
    const kv = line.match(/^\s*other\s*=\s*"([\s\S]*?)"\s*$/);
    if (kv && current) map[current] = kv[1];
  }
  return map;
}

// Resolve from the project root (cwd at build/dev time). The import.meta.url
// path breaks once Astro bundles this module into a hashed chunk, so cwd is the
// reliable anchor; fall back to the module-relative path for safety.
function loadTable(file: string): Record<string, string> {
  const cwdPath = join(process.cwd(), 'i18n', file);
  const fromCwd = parseHugoI18n(cwdPath);
  if (Object.keys(fromCwd).length > 0) return fromCwd;
  return parseHugoI18n(fileURLToPath(new URL(`../../i18n/${file}`, import.meta.url)));
}

const cs = loadTable('cs.toml');
const en = loadTable('en.toml');

const TABLES: Record<Locale, Record<string, string>> = { cs, en };

/** UI translation lookup. Falls back to cs, then to the key itself. */
export function t(locale: Locale, key: string): string {
  return TABLES[locale]?.[key] ?? TABLES.cs[key] ?? key;
}

export default t;
