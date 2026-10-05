/**
 * Extractor for the `o-nas` collection family (About: ombudsman, deputy, history,
 * regulations) + child collection `o-nas-timeline`.
 *
 * cs: content/o-nas/<slug>/index.md  -> src/content/o-nas/<slug>/index.md
 *     (the `historie` entry's timeline[] is split into
 *      src/content/o-nas/<slug>/timeline/<NNNN>.md children; timeline is dropped
 *      from the parent frontmatter)
 * en: content-en/o-nas/<slug>/index.md -> src/content/o-nas-en/<slug>/index.md
 *     (timeline kept INLINE per the o-nas-en schema)
 *
 * Asset rule: bundle-relative refs (pic/footerPic/illustration + body img/links)
 * are copied to public/media/<col>/<slug>/ and rewritten to absolute /media/...
 * Absolute (/images/.., /media/..) and external refs are left untouched.
 *
 * Idempotent. Prints counts and asserts output == source (incl. timeline items).
 *
 * Run: bun scripts/extract-o-nas.ts
 */
import matter from 'gray-matter';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

const ROOT = join(import.meta.dir, '..');

interface Variant {
  srcDir: string; // source bundle root (read-only)
  destDir: string; // src/content/<col>
  col: string; // collection key (media folder)
  splitTimeline: boolean; // cs: split timeline into child files
}

const VARIANTS: Variant[] = [
  { srcDir: join(ROOT, 'content', 'o-nas'), destDir: join(ROOT, 'src/content/o-nas'), col: 'o-nas', splitTimeline: true },
  { srcDir: join(ROOT, 'content-en', 'o-nas'), destDir: join(ROOT, 'src/content/o-nas-en'), col: 'o-nas-en', splitTimeline: false },
];

// Frontmatter fields that may hold a bundle-relative image/file path.
const ASSET_FIELDS = ['pic', 'footerPic', 'illustration'];

function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  if (ref.startsWith('/')) return false; // absolute (/images/.., /media/..)
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return false; // http:, https:, mailto:, data:, tel:
  if (ref.startsWith('#')) return false; // in-page anchor
  return true;
}

function ensureDir(d: string) {
  mkdirSync(d, { recursive: true });
}

let copiedAssets = 0;

/** Copy a bundle binary into public/media/<col>/<slug>/ and return its absolute /media path. */
function copyAsset(ref: string, bundleDir: string, col: string, slug: string): string {
  const cleanRef = ref.split('#')[0].split('?')[0];
  const srcPath = join(bundleDir, cleanRef);
  if (!existsSync(srcPath) || !statSync(srcPath).isFile()) {
    throw new Error(`Missing bundle asset: ${srcPath} (referenced "${ref}")`);
  }
  const destPath = join(ROOT, 'public', 'media', col, slug, cleanRef);
  ensureDir(dirname(destPath));
  copyFileSync(srcPath, destPath);
  copiedAssets++;
  const suffix = ref.slice(cleanRef.length); // preserve any #fragment / ?query
  return `/media/${col}/${slug}/${cleanRef}${suffix}`;
}

/** Rewrite bundle-relative asset refs in a markdown/HTML body. */
function rewriteBody(body: string, bundleDir: string, col: string, slug: string): string {
  let out = body;
  // markdown images and links: ![alt](url) / [text](url)
  out = out.replace(/(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (m, pre, url, post) => {
    if (!isBundleRelative(url)) return m;
    return pre + copyAsset(url, bundleDir, col, slug) + post;
  });
  // raw HTML src="" / href=""
  out = out.replace(/\b(src|href)=(["'])([^"']+)\2/g, (m, attr, q, url) => {
    if (!isBundleRelative(url)) return m;
    return `${attr}=${q}${copyAsset(url, bundleDir, col, slug)}${q}`;
  });
  return out;
}

let parentCount = 0;
let timelineChildCount = 0;
let sourceTimelineTotal = 0;

function processVariant(v: Variant) {
  const slugs = readdirSync(v.srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let srcEntries = 0;

  for (const slug of slugs) {
    const bundleDir = join(v.srcDir, slug);
    // find index.{md,mdx,markdown}, skip _index.*
    const indexFile = readdirSync(bundleDir).find((f) => /^index\.(md|mdx|markdown)$/.test(f));
    if (!indexFile) continue;
    srcEntries++;

    const raw = readFileSync(join(bundleDir, indexFile), 'utf8');
    const parsed = matter(raw);
    const data: Record<string, any> = { ...parsed.data };
    let body = parsed.content;

    // rewrite frontmatter asset fields
    for (const field of ASSET_FIELDS) {
      const val = data[field];
      if (typeof val === 'string' && isBundleRelative(val)) {
        data[field] = copyAsset(val, bundleDir, v.col, slug);
      }
    }

    // rewrite body asset refs
    body = rewriteBody(body, bundleDir, v.col, slug);

    // timeline handling
    const timeline = Array.isArray(data.timeline) ? data.timeline : [];
    if (v.splitTimeline && timeline.length > 0) {
      sourceTimelineTotal += timeline.length;
      delete data.timeline;
      const tlDir = join(v.destDir, slug, 'timeline');
      rmSync(tlDir, { recursive: true, force: true }); // drop stale children (idempotent on shrink)
      ensureDir(tlDir);
      timeline.forEach((item: any, i: number) => {
        const order = i + 1;
        const childData = { time: String(item?.time ?? ''), order };
        const childBody = rewriteBody((item?.desc ?? '').toString(), bundleDir, v.col, slug);
        const childOut = matter.stringify(childBody.endsWith('\n') ? childBody : childBody + '\n', childData);
        const fname = String(order).padStart(4, '0') + '.md';
        writeFileSync(join(tlDir, fname), childOut);
        timelineChildCount++;
      });
    }
    // (en keeps `data.timeline` inline as-is)

    const destFile = join(v.destDir, slug, 'index.md');
    ensureDir(dirname(destFile));
    writeFileSync(destFile, matter.stringify(body, data));
    parentCount++;
  }

  // assert per-variant: output index files == source entries
  const outSlugs = readdirSync(v.destDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => existsSync(join(v.destDir, e.name, 'index.md'))).length;
  console.log(`[${v.col}] source entries=${srcEntries} -> written index files=${outSlugs}`);
  if (outSlugs !== srcEntries) {
    throw new Error(`[${v.col}] entry count mismatch: source ${srcEntries} vs written ${outSlugs}`);
  }
}

for (const v of VARIANTS) processVariant(v);

console.log(`\nParent entries written: ${parentCount}`);
console.log(`Timeline children written (cs): ${timelineChildCount} (source timeline items: ${sourceTimelineTotal})`);
console.log(`Bundle assets copied: ${copiedAssets}`);

if (timelineChildCount !== sourceTimelineTotal) {
  throw new Error(`Timeline child count mismatch: ${timelineChildCount} vs source ${sourceTimelineTotal}`);
}
console.log('\nOK — all counts asserted.');
