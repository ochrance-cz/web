/**
 * extract-info-group.ts
 *
 * Migrates the "info" group of small flat collections from Hugo (content/, content-en/)
 * to Astro content collections (src/content/<key>/<slug>/index.md).
 *
 * Collections handled:
 *   - info        (cs)  content/info/<slug>/index.md
 *   - info-en     (en)  content-en/info/<slug>/index.md
 *   - info106     (cs)  content/info106/<slug>/index.md   (body = PDF link HTML)
 *   - provoz      (cs)  content/provoz/<slug>/index.md
 *   - provoz-en   (en)  content-en/provoz/<slug>/index.md
 *
 * Asset rule: a *bundle-relative* ref (no leading "/", not http(s):, mailto:, #, or "../")
 * that corresponds to a real file inside the entry's source directory is copied to
 * public/media/<key>/<slug>/<basename> and rewritten to /media/<key>/<slug>/<basename>.
 * This is applied to body raw-HTML <img src>/<a href>, markdown ![](x)/[..](x), AND
 * frontmatter string values (illustration, links[].link, linksAfter[].link, etc.).
 * Absolute (/uploads-import, /media, ...) and external (http(s)://, mailto:) refs stay.
 *
 * Idempotent: safe to re-run. Prints counts and asserts output == source per collection.
 *
 * Run: bun scripts/extract-info-group.ts
 */
import matter from 'gray-matter';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { editorMarkdown } from './lib/editor-markdown';

const ROOT = join(import.meta.dir, '..');

interface Job {
  key: string; // destination collection key (= src/content/<key>)
  srcBase: string; // source directory holding <slug>/index.{md,markdown}
}

const JOBS: Job[] = [
  { key: 'info', srcBase: join(ROOT, 'content/info') },
  { key: 'info-en', srcBase: join(ROOT, 'content-en/info') },
  { key: 'info106', srcBase: join(ROOT, 'content/info106') },
  { key: 'provoz', srcBase: join(ROOT, 'content/provoz') },
  { key: 'provoz-en', srcBase: join(ROOT, 'content-en/provoz') },
];

const requestedKeys = new Set(process.argv.slice(2));
const jobs = requestedKeys.size > 0
  ? JOBS.filter((job) => requestedKeys.has(job.key))
  : JOBS;

if (requestedKeys.size > 0 && jobs.length !== requestedKeys.size) {
  const known = new Set(JOBS.map((job) => job.key));
  const unknown = [...requestedKeys].filter((key) => !known.has(key));
  throw new Error(`Unknown collection key(s): ${unknown.join(', ')}`);
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Find the index.{md,mdx,markdown} file inside a slug directory. */
function findIndexFile(slugDir: string): string | null {
  for (const name of ['index.md', 'index.mdx', 'index.markdown']) {
    const p = join(slugDir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Is this ref bundle-relative (a candidate for copy+rewrite)? */
function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  const r = ref.trim();
  if (r === '') return false;
  if (r.startsWith('/')) return false; // absolute path
  if (r.startsWith('#')) return false; // anchor
  if (r.startsWith('../') || r.startsWith('./')) return false; // relative traversal -> leave
  if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return false; // has a scheme (http:, mailto:, tel:, data:)
  return true;
}

/** Split an URL-ish string into the path part and the optional ?query/#hash suffix. */
function splitSuffix(ref: string): { path: string; suffix: string } {
  const m = ref.match(/^([^?#]*)([?#].*)?$/);
  return { path: m?.[1] ?? ref, suffix: m?.[2] ?? '' };
}

/**
 * Given a bundle-relative ref, if the referenced file exists in the entry source dir,
 * copy it into public/media/<key>/<slug>/ and return the rewritten absolute ref.
 * Otherwise return null (caller leaves the ref unchanged).
 */
function maybeCopyAndRewrite(ref: string, ctx: { key: string; slug: string; srcDir: string }, copied: Set<string>): string | null {
  if (!isBundleRelative(ref)) return null;
  const { path: relPath, suffix } = splitSuffix(ref);
  // A ref may be percent-encoded (e.g. "foto%20a.jpg"); decode to locate the file
  // on disk, but tolerate malformed `%` sequences (treat as a literal path).
  let decoded: string;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    decoded = relPath;
  }
  const srcFile = join(ctx.srcDir, decoded);
  if (!existsSync(srcFile)) return null;
  try {
    if (!statSync(srcFile).isFile()) return null;
  } catch {
    return null;
  }
  const file = basename(decoded);
  const destDir = join(ROOT, 'public/media', ctx.key, ctx.slug);
  ensureDir(destDir);
  const destFile = join(destDir, file);
  copyFileSync(srcFile, destFile);
  copied.add(destFile);
  // Re-encode the basename so spaces / diacritics produce a valid URL.
  return `/media/${ctx.key}/${ctx.slug}/${encodeURIComponent(file)}` + suffix;
}

/** Rewrite bundle-relative refs embedded in markdown / raw-HTML text. */
function rewriteRefsInText(text: string, ctx: { key: string; slug: string; srcDir: string }, copied: Set<string>): string {
  if (!text) return text;
  let out = text;

  // HTML attributes: src="..." / href="..." (single or double quotes)
  out = out.replace(/\b(src|href)\s*=\s*(["'])(.*?)\2/gi, (full, attr, q, val) => {
    const rewritten = maybeCopyAndRewrite(val, ctx, copied);
    return rewritten ? `${attr}=${q}${rewritten}${q}` : full;
  });

  // Markdown links / images: ![alt](url) and [label](url), optional "title" or 'title'
  out = out.replace(/(!?\[[^\]]*\])\(([^)\s]+)(\s+(?:"[^"]*"|'[^']*'))?\)/g, (full, label, url, title) => {
    const rewritten = maybeCopyAndRewrite(url, ctx, copied);
    return rewritten ? `${label}(${rewritten}${title ?? ''})` : full;
  });

  return out;
}

/** Recursively rewrite bundle-relative refs found as full string values in frontmatter. */
function rewriteFrontmatter(value: any, ctx: { key: string; slug: string; srcDir: string }, copied: Set<string>): any {
  if (typeof value === 'string') {
    // First: whole-string bare ref (e.g. illustration: setreni.jpg, link: x.pdf)
    const whole = maybeCopyAndRewrite(value, ctx, copied);
    if (whole) return whole;
    // Otherwise: embedded markdown/HTML refs inside longer strings (e.g. intro markdown)
    return rewriteRefsInText(value, ctx, copied);
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteFrontmatter(v, ctx, copied));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteFrontmatter(v, ctx, copied);
    return out;
  }
  return value;
}

let grandTotal = 0;
const allCopied = new Set<string>();

for (const job of jobs) {
  if (!existsSync(job.srcBase)) {
    console.warn(`! source missing for ${job.key}: ${job.srcBase}`);
    continue;
  }
  const slugs = readdirSync(job.srcBase, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let written = 0;
  let sourceCount = 0;
  const copied = new Set<string>();

  for (const slug of slugs) {
    const srcDir = join(job.srcBase, slug);
    const indexFile = findIndexFile(srcDir);
    if (!indexFile) continue; // not a content bundle, skip
    sourceCount++;

    const raw = readFileSync(indexFile, 'utf8');
    const parsed = matter(raw);
    const ctx = { key: job.key, slug, srcDir };

    const newData = rewriteFrontmatter(parsed.data, ctx, copied);
    // `title` must be a string (year-only titles like 2011 parse as numbers).
    if (newData.title != null && typeof newData.title !== 'string') {
      newData.title = String(newData.title);
    }
    const newBody = editorMarkdown(rewriteRefsInText(parsed.content, ctx, copied));
    if (newBody) newData.body = newBody;

    const isContacts = slug === 'kontakty' && (job.key === 'provoz' || job.key === 'provoz-en');
    const outputKey = isContacts ? `provoz-kontakty${job.key === 'provoz-en' ? '-en' : ''}` : job.key;
    const outDir = isContacts
      ? join(ROOT, 'src/content', outputKey)
      : join(ROOT, 'src/content', outputKey, slug);
    ensureDir(outDir);
    const outFile = join(outDir, 'index.md');
    const serialized = matter.stringify('', newData);
    writeFileSync(outFile, serialized);
    written++;
  }

  for (const c of copied) allCopied.add(c);
  grandTotal += written;

  console.log(`[${job.key}] source=${sourceCount} written=${written} assets=${copied.size}`);
  if (written !== sourceCount) {
    throw new Error(`COUNT MISMATCH for ${job.key}: source=${sourceCount} written=${written}`);
  }
}

console.log(`\nTotal entries written: ${grandTotal}`);
console.log(`Total bundle assets copied: ${allCopied.size}`);
