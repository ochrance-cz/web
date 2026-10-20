import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Locale = 'cs' | 'en';

// The CMS stores every upload under a random UUID, so a replaced file gets a new address.
const UPLOAD = /^\/uploads\/[^/]+\.([a-z0-9]{1,8})$/i;

/**
 * The stable address of a leaflet's main file, derived from its slug:
 * `/letaky/<slug>/<slug>.pdf`, the shape the leaflets had before the CMS.
 * Only files uploaded through the CMS get one; the imported ones keep their own path.
 */
export function leafletFilePath(locale: Locale, slug: string, file: string | undefined): string | undefined {
  const ext = file?.match(UPLOAD)?.[1]?.toLowerCase();
  if (!ext) return undefined;
  return `${locale === 'en' ? '/en' : ''}/letaky/${slug}/${slug}.${ext}`;
}

/** Where pages link the file. The address exists only through `_redirects`, so `astro dev` links the upload itself. */
export function leafletFileHref(locale: Locale, slug: string, file: string | undefined): string | undefined {
  return (import.meta.env.PROD && leafletFilePath(locale, slug, file)) || file;
}

const COLLECTIONS: [Locale, string][] = [['cs', 'src/content/letaky'], ['en', 'src/content/letaky-en']];

/**
 * `_redirects` rules from each leaflet's stable address to its current upload.
 * 302, not 301: browsers cache a 301, and would keep the old file after a replacement.
 */
export async function leafletFileRedirects(): Promise<string[]> {
  const rules: string[] = [];
  for (const [locale, dir] of COLLECTIONS) {
    const names = await readdir(dir).catch(() => [] as string[]);
    for (const name of names.filter(n => n.endsWith('.md')).sort()) {
      const text = await readFile(join(dir, name), 'utf-8');
      const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const file = frontmatter.match(/^file:\s*['"]?([^'"\n]+?)['"]?\s*$/m)?.[1];
      const from = leafletFilePath(locale, name.slice(0, -'.md'.length), file);
      if (from) rules.push(`${from} ${file} 302`);
    }
  }
  return rules;
}
