/**
 * Extract the `pusobnost` (Scope of authority) collection family from the Hugo
 * source into Astro content collections.
 *
 *   content/pusobnost/<slug>/index.md       -> src/content/pusobnost/<slug>/index.md
 *   content-en/pusobnost/<slug>/index.md    -> src/content/pusobnost-en/<slug>/index.md
 *
 * Asset rule: bundle-relative refs (frontmatter `illustration` + body markdown /
 * raw-HTML image & link refs) are copied to
 * public/media/<key>/<slug>/<file> and rewritten to the absolute /media/... path.
 * Absolute (/media, /images, ...) and external (http(s):, mailto:, #) refs are
 * left untouched.
 *
 * Idempotent — safe to re-run. Prints counts and asserts output == source.
 *
 * Run with: bun scripts/extract-pusobnost.ts
 */
import matter from 'gray-matter';
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

interface Unit {
  key: string; // target collection key
  src: string; // source bundle dir
}

const ROOT = join(import.meta.dir, '..');

const UNITS: Unit[] = [
  { key: 'pusobnost', src: join(ROOT, 'content/pusobnost') },
  { key: 'pusobnost-en', src: join(ROOT, 'content-en/pusobnost') },
];

/** Is a ref bundle-relative (a local file shipped next to index.md)? */
function isBundleRelative(ref: string): boolean {
  const r = ref.trim();
  if (!r) return false;
  if (r.startsWith('/')) return false; // absolute -> leave
  if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return false; // http:, https:, mailto:, tel:, data:
  if (r.startsWith('#')) return false; // in-page anchor
  return true;
}

/** Strip query/hash for filesystem lookup, keep them for the rewritten URL. */
function splitRef(ref: string): { file: string; suffix: string } {
  const m = ref.match(/^([^?#]*)([?#].*)?$/);
  return { file: m?.[1] ?? ref, suffix: m?.[2] ?? '' };
}

/**
 * Copy a bundle-relative asset into public/media/<key>/<slug>/ and return the
 * rewritten absolute path. Returns the original ref unchanged if the file does
 * not exist in the bundle (so we never produce dangling rewrites).
 */
function rewriteAsset(
  ref: string,
  srcDir: string,
  publicDir: string,
  key: string,
  slug: string,
  copied: Set<string>,
): string {
  if (!isBundleRelative(ref)) return ref;
  const { file, suffix } = splitRef(ref);
  const cleaned = file.replace(/^\.\//, ''); // URL form (may be percent-encoded)
  // Filesystem name: decode percent-escapes (e.g. "my%20photo.png" -> "my photo.png").
  let fsName = cleaned;
  try {
    fsName = decodeURIComponent(cleaned);
  } catch {
    /* malformed escape — fall back to the raw name */
  }
  const abs = join(srcDir, fsName);
  if (!existsSync(abs) || !statSync(abs).isFile()) return ref;
  const dest = join(publicDir, slug, fsName);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(abs, dest);
  copied.add(fsName);
  // Keep the original (possibly encoded) URL form so the rewritten link stays valid.
  return `/media/${key}/${slug}/${cleaned}${suffix}`;
}

/** Rewrite bundle-relative asset refs inside a markdown/HTML body. */
function rewriteBody(
  body: string,
  srcDir: string,
  publicDir: string,
  key: string,
  slug: string,
  copied: Set<string>,
): string {
  let out = body;
  // Markdown images & links: ![alt](url "title") / [text](url 'title') / (url (title))
  out = out.replace(
    /(!?\[[^\]]*\]\()(\s*<?)([^)\s>]+)(>?)((?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\))/g,
    (m, pre, lt, url, gt, post) =>
      `${pre}${lt}${rewriteAsset(url, srcDir, publicDir, key, slug, copied)}${gt}${post}`,
  );
  // Raw HTML asset attributes (single- or double-quoted): src, href, poster, data-src.
  out = out.replace(
    /((?:src|href|poster|data-src)\s*=\s*)(["'])([^"']+)(\2)/gi,
    (m, pre, q, url, qend) =>
      `${pre}${q}${rewriteAsset(url, srcDir, publicDir, key, slug, copied)}${qend}`,
  );
  return out;
}

// Frontmatter string fields that may hold a bundle-relative image ref.
const IMAGE_FIELDS = ['illustration'];

async function processUnit(unit: Unit): Promise<{ written: number; sources: number }> {
  const { key, src } = unit;
  if (!existsSync(src)) {
    console.warn(`[${key}] source dir missing: ${src}`);
    return { written: 0, sources: 0 };
  }
  const outDir = join(ROOT, 'src/content', key);
  const publicDir = join(ROOT, 'public/media', key);

  const slugs = readdirSync(src, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let written = 0;
  let sources = 0;

  for (const slug of slugs) {
    const indexPath = join(src, slug, 'index.md');
    if (!existsSync(indexPath)) continue; // skip dirs without an index (no _index here)
    sources++;

    const raw = await readFile(indexPath, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const copied = new Set<string>();

    // Frontmatter image fields.
    for (const field of IMAGE_FIELDS) {
      const val = data[field];
      if (typeof val === 'string' && val) {
        data[field] = rewriteAsset(val, join(src, slug), publicDir, key, slug, copied);
      }
    }

    // Body refs.
    const body = rewriteBody(parsed.content, join(src, slug), publicDir, key, slug, copied);

    const outPath = join(outDir, slug, 'index.md');
    mkdirSync(dirname(outPath), { recursive: true });
    const outContent = matter.stringify(body, data);
    await writeFile(outPath, outContent, 'utf8');
    written++;
    console.log(`[${key}] ${slug} -> ${written}` + (copied.size ? `  (assets: ${[...copied].join(', ')})` : ''));
  }

  return { written, sources };
}

let ok = true;
for (const unit of UNITS) {
  const { written, sources } = await processUnit(unit);
  console.log(`\n[${unit.key}] wrote ${written} entries (source: ${sources})`);
  if (written !== sources) {
    console.error(`[${unit.key}] COUNT MISMATCH: wrote ${written}, expected ${sources}`);
    ok = false;
  }
}

if (!ok) {
  console.error('\nExtraction FAILED: counts do not match.');
  process.exit(1);
}
console.log('\nExtraction OK.');
