import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
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

/** Where pages link the file. The address exists only in the build, so `astro dev` and the CMS preview link the upload itself. */
export function leafletFileHref(locale: Locale, slug: string, file: string | undefined): string | undefined {
  return (import.meta.env.PROD && leafletFilePath(locale, slug, file)) || file;
}

const COLLECTIONS: [Locale, string][] = [['cs', 'src/content/letaky'], ['en', 'src/content/letaky-en']];

/** Each leaflet with an uploaded main file: its stable address and the upload it serves. */
export async function leafletFiles(): Promise<{ from: string; file: string }[]> {
  const files: { from: string; file: string }[] = [];
  for (const [locale, dir] of COLLECTIONS) {
    const names = await readdir(dir).catch(() => [] as string[]);
    for (const name of names.filter(n => n.endsWith('.md')).sort()) {
      const text = await readFile(join(dir, name), 'utf-8');
      const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const file = frontmatter.match(/^file:\s*['"]?([^'"\n]+?)['"]?\s*$/m)?.[1];
      const from = leafletFilePath(locale, name.slice(0, -'.md'.length), file);
      if (from && file) files.push({ from, file });
    }
  }
  return files;
}

/**
 * Copy each leaflet's current upload to its stable address in the build and return
 * the `_redirects` rules that serve it there. A redirect would leave the upload's
 * random name in the address bar, and editors copy links from there.
 * The `200` rule to itself outranks older rules for the same path, such as one
 * pointing at the file the leaflet had before the CMS.
 */
export async function publishLeafletFiles(dist: URL, warn: (message: string) => void): Promise<string[]> {
  const rules: string[] = [];
  for (const { from, file } of await leafletFiles()) {
    const source = new URL(`.${file}`, dist);
    const target = new URL(`.${from}`, dist);
    try {
      await mkdir(new URL('.', target), { recursive: true });
      await copyFile(source, target);
      rules.push(`${from} ${from} 200`);
    } catch (error) {
      // Without the upload in the build, at least lead to wherever it is served.
      warn(`Leaflet file ${file} for ${from} not copied: ${String(error)}`);
      rules.push(`${from} ${file} 302`);
    }
  }
  return rules;
}
