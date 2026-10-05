/**
 * Extract the `dokument` collection family (cs `dokument`, en `dokument-en`)
 * from the Hugo source bundles into Astro content collections.
 *
 * For each bundle (content[-en]/dokument/<slug>/index.md):
 *  - read frontmatter + body with gray-matter,
 *  - rewrite BUNDLE-RELATIVE asset refs (frontmatter `file`,
 *    `attachmentsTop[].file/.link`, `attachments[].file/.link` AND body
 *    markdown `](x)` / raw-HTML `src="x"` / `href="x"`) by copying the binary
 *    to public/media/<key>/<slug>/<file> and rewriting the ref to
 *    /media/<key>/<slug>/<file>,
 *  - leave absolute (`/…`) and external (`http(s):`, `mailto:`, `#`) refs as-is,
 *  - write src/content/<key>/<slug>/index.md (frontmatter re-emitted + body).
 *
 * Idempotent: re-reads from the untouched source and overwrites outputs.
 * Run: `bun scripts/extract-dokument.ts`
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';

const ROOT = join(import.meta.dir, '..');

interface Unit {
  key: string; // output collection key
  srcDir: string; // source bundle root
}

const UNITS: Unit[] = [
  { key: 'dokument', srcDir: join(ROOT, 'content', 'dokument') },
  { key: 'dokument-en', srcDir: join(ROOT, 'content-en', 'dokument') },
];

/** A ref is bundle-relative when it has no scheme, no leading slash, no anchor. */
function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  const r = ref.trim();
  if (r === '') return false;
  if (r.startsWith('/')) return false; // absolute path
  if (r.startsWith('#')) return false; // in-page anchor
  if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return false; // http:, https:, mailto:, tel:, data:
  return true;
}

/** Split a possible "file#frag?query" into [path, suffix]. */
function splitSuffix(ref: string): [string, string] {
  const m = ref.match(/^([^#?]*)([#?].*)?$/);
  return [m?.[1] ?? ref, m?.[2] ?? ''];
}

function tryDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

let copiedAssets = 0;
const missingRefs: string[] = [];

/**
 * If `ref` is a bundle-relative file that exists in `srcDir`, copy it to
 * public/media/<key>/<slug>/ and return the rewritten /media/... path.
 * Otherwise return `ref` unchanged.
 */
function rewriteRef(ref: string, srcDir: string, key: string, slug: string): string {
  if (!isBundleRelative(ref)) return ref;
  const [pathPart, suffix] = splitSuffix(ref);
  const clean = pathPart.replace(/^\.\//, '');
  if (clean === '') return ref;

  // Resolve the binary in the source bundle (try raw + URL-decoded name).
  const candidates = [clean, tryDecode(clean)];
  let found: string | null = null;
  for (const c of candidates) {
    const p = join(srcDir, c);
    if (existsSync(p) && statSync(p).isFile()) {
      found = c;
      break;
    }
  }
  if (!found) {
    missingRefs.push(`[${key}/${slug}] ${ref}`);
    return ref; // leave untouched; nothing to copy
  }

  const destPath = join(ROOT, 'public', 'media', key, slug, found);
  mkdirSync(dirname(destPath), { recursive: true }); // `found` may contain sub-dirs
  copyFileSync(join(srcDir, found), destPath);
  copiedAssets++;

  // Output path: keep the on-disk filename; URL-encode segments for safety.
  const encoded = found.split('/').map((s) => encodeURIComponent(s)).join('/');
  return `/media/${key}/${slug}/${encoded}${suffix}`;
}

/** Rewrite all bundle-relative refs found in a raw markdown/HTML body. */
function rewriteBody(body: string, srcDir: string, key: string, slug: string): string {
  let out = body;

  // Markdown links & images: [text](url "title") / ![alt](url)
  out = out.replace(/(!?\[[^\]]*\]\()(\s*)([^)\s]+)(\s+"[^"]*")?(\s*\))/g, (m, pre, ws, url, title, post) => {
    const nu = rewriteRef(url, srcDir, key, slug);
    return `${pre}${ws}${nu}${title ?? ''}${post}`;
  });

  // Raw HTML attributes: src="…" / href="…" (single or double quotes)
  out = out.replace(/(\b(?:src|href)\s*=\s*)(["'])([^"']+)\2/gi, (m, attr, q, url) => {
    const nu = rewriteRef(url, srcDir, key, slug);
    return `${attr}${q}${nu}${q}`;
  });

  return out;
}

type AttachmentLike = { file?: string; link?: string; [k: string]: unknown };

function rewriteAttachments(arr: unknown, srcDir: string, key: string, slug: string): void {
  if (!Array.isArray(arr)) return;
  for (const item of arr as AttachmentLike[]) {
    if (item && typeof item === 'object') {
      if (typeof item.file === 'string' && item.file) item.file = rewriteRef(item.file, srcDir, key, slug);
      if (typeof item.link === 'string' && item.link) item.link = rewriteRef(item.link, srcDir, key, slug);
    }
  }
}

/**
 * Resolve a bundle's index markdown. Prefers the canonical `index.{md,mdx,markdown}`,
 * but falls back to a stray `index_N.*` (a Decap save artifact) so real content in
 * folders that lost their `index.md` is rescued rather than silently dropped.
 * Returns null for asset-only folders (no markdown at all).
 */
function findIndex(dir: string): string | null {
  for (const f of ['index.md', 'index.mdx', 'index.markdown']) {
    const p = join(dir, f);
    if (existsSync(p)) return p;
  }
  const fallback = readdirSync(dir)
    .filter((f) => /^index.*\.(md|mdx|markdown)$/i.test(f) && f !== '_index.md')
    .sort();
  return fallback.length ? join(dir, fallback[0]) : null;
}

function listBundles(srcDir: string): string[] {
  return readdirSync(srcDir)
    .filter((name) => {
      if (name.startsWith('_')) return false;
      const dir = join(srcDir, name);
      if (!statSync(dir).isDirectory()) return false;
      return findIndex(dir) !== null;
    })
    .sort();
}

function indexFile(dir: string): string {
  const p = findIndex(dir);
  if (!p) throw new Error(`no index file in ${dir}`);
  return p;
}

let totalSrc = 0;
let totalOut = 0;

for (const unit of UNITS) {
  const slugs = listBundles(unit.srcDir);
  totalSrc += slugs.length;
  let written = 0;

  for (const slug of slugs) {
    const srcBundle = join(unit.srcDir, slug);
    const raw = readFileSync(indexFile(srcBundle), 'utf8');
    const { data, content } = matter(raw);

    // Frontmatter asset refs.
    if (typeof data.file === 'string' && data.file) {
      data.file = rewriteRef(data.file, srcBundle, unit.key, slug);
    }
    rewriteAttachments(data.attachmentsTop, srcBundle, unit.key, slug);
    rewriteAttachments(data.attachments, srcBundle, unit.key, slug);

    // Body asset refs.
    const newBody = rewriteBody(content, srcBundle, unit.key, slug);

    const outDir = join(ROOT, 'src', 'content', unit.key, slug);
    mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, 'index.md');
    writeFileSync(outFile, matter.stringify(newBody, data));
    written++;
  }

  totalOut += written;
  console.log(`[${unit.key}] source bundles=${slugs.length} written=${written}`);
  if (written !== slugs.length) {
    throw new Error(`[${unit.key}] written ${written} != source ${slugs.length}`);
  }
}

console.log(`assets copied: ${copiedAssets}`);
if (missingRefs.length) {
  console.log(`bundle-relative refs with NO matching file (left unchanged): ${missingRefs.length}`);
  for (const r of missingRefs.slice(0, 20)) console.log(`  - ${r}`);
}
console.log(`TOTAL source=${totalSrc} written=${totalOut}`);
if (totalSrc !== totalOut) throw new Error(`count mismatch: source ${totalSrc} != written ${totalOut}`);
console.log('OK');
