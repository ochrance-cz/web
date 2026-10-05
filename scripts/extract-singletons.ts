/**
 * extract-singletons.ts — Hugo → Astro/Nua extractor for the SINGLETON / data
 * collections (unit 16).
 *
 * Sources (read-only):
 *   - root single files:   content/<x>.md, content-en/<x>.md
 *   - section indexes:      content/<sec>/_index.markdown (+ -en)
 *   - podejte-stiznost bundles: content/podejte-stiznost/<slug>/index.md
 *
 * Targets (created):
 *   - src/content/<key>/index.md             (SINGLE-pattern collections)
 *   - src/content/podejte-stiznost/<slug>/index.md (BUNDLE-pattern)
 *   - public/media/<key>/[<slug>/]<file>     (bundle-relative binaries)
 *
 * Idempotent: safe to re-run. Prints + asserts counts.
 */
import matter from 'gray-matter';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/content');

function read(p: string) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function writeOut(rel: string, content: string) {
  const dest = path.join(SRC, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

/** A ref is bundle-relative if it is a bare filename (no leading slash / scheme / anchor). */
function isBundleRel(ref: string): boolean {
  return !!ref && !/^(\/|https?:|mailto:|tel:|#|data:)/i.test(ref);
}

let assets = 0;

/** Copy a bundle-relative file into public/media/<key>/<slug>/ and return the absolute ref. */
function rewriteRef(ref: string, bundleDir: string, mediaRel: string): string {
  if (!isBundleRel(ref)) return ref;
  const srcFile = path.join(bundleDir, ref);
  if (!fs.existsSync(srcFile)) return ref; // placeholder / missing — leave as-is
  const file = path.basename(ref);
  const destDir = path.join(ROOT, 'public/media', mediaRel);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcFile, path.join(destDir, file));
  assets++;
  return `/media/${mediaRel}/${file}`;
}

function rewriteBody(body: string, bundleDir: string, mediaRel: string): string {
  // markdown ![alt](url) and [text](url)
  body = body.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (_m, a, url, c) => a + rewriteRef(url, bundleDir, mediaRel) + c);
  // raw html src=/href=
  body = body.replace(/(<(?:img|a|source)\b[^>]*?(?:src|href)=["'])([^"']+)(["'])/gi, (_m, a, url, c) => a + rewriteRef(url, bundleDir, mediaRel) + c);
  return body;
}

// ============================================================
// 1) SINGLE-pattern singletons: re-emit frontmatter+body to <key>/index.md
//    (root single files + section _index.markdown)
// ============================================================
const singles: Array<[src: string, key: string]> = [
  // root single files (cs)
  ['content/kontakt.md', 'kontakt'],
  ['content/kontrola.md', 'kontrola'],
  ['content/manual.md', 'manual'],
  ['content/newsletter.md', 'newsletter'],
  ['content/pro-media.md', 'pro-media'],
  ['content/style.md', 'style'],
  ['content/vyzkumy-vse.md', 'vyzkumy-vse'],
  ['content/zpravodaj-vse.md', 'zpravodaj-vse'],
  // root single files (en)
  ['content-en/kontakt.md', 'kontakt-en'],
  ['content-en/kontrola.md', 'kontrola-en'],
  // section-index singletons
  ['content/alert/_index.markdown', 'alert'],
  ['content-en/alert/_index.markdown', 'alert-en'],
  ['content/hledat/_index.markdown', 'hledat'],
  ['content-en/hledat/_index.markdown', 'hledat-en'],
];

let singleCount = 0;
for (const [srcPath, key] of singles) {
  const raw = read(srcPath);
  const { data, content } = matter(raw);
  if (!data.title) data.title = key; // schemas need a title (alert/hledat allow optional)
  writeOut(`${key}/index.md`, matter.stringify(content, data));
  singleCount++;
}

// ============================================================
// 2) podejte-stiznost (BUNDLE): per-slug entries + synthetic "main" landing
// ============================================================

// 2a. real bundle entries (cs only): braille, czj — keep `contact`, copy pics
const psDir = path.join(ROOT, 'content/podejte-stiznost');
const psSlugs = fs
  .readdirSync(psDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(psDir, d.name, 'index.md')))
  .map((d) => d.name)
  .sort();

let bundleCount = 0;
for (const slug of psSlugs) {
  const bundleDir = path.join(psDir, slug);
  const { data, content } = matter(fs.readFileSync(path.join(bundleDir, 'index.md'), 'utf8'));
  const mediaRel = `podejte-stiznost/${slug}`;
  if (data.contact && typeof data.contact === 'object') {
    const c = data.contact as Record<string, any>;
    if (c.pic) c.pic = rewriteRef(String(c.pic), bundleDir, mediaRel);
  }
  const body = rewriteBody(content, bundleDir, mediaRel);
  writeOut(`podejte-stiznost/${slug}/index.md`, matter.stringify(body, data));
  bundleCount++;
}

// 2b. synthetic "main" landing entries (cs + en) from _index.markdown
//     (the rich form-download data lives outside this narrow schema; we keep the
//     landing title + description so /podejte-stiznost/ and /en/podejte-stiznost/ render)
function writeMain(srcPath: string, key: string) {
  const { data } = matter(read(srcPath));
  const fm: Record<string, any> = { title: data.title || 'Podejte podnět' };
  const body = data.description ? String(data.description) : '';
  writeOut(`${key}/main/index.md`, matter.stringify(body, fm));
}
writeMain('content/podejte-stiznost/_index.markdown', 'podejte-stiznost');
writeMain('content-en/podejte-stiznost/_index.markdown', 'podejte-stiznost-en');

// ============================================================
// Report + assertions
// ============================================================
console.log('--- extract-singletons ---');
console.log(`SINGLE collections written : ${singleCount} (expected ${singles.length})`);
console.log(`podejte-stiznost bundles    : ${bundleCount} (${psSlugs.join(', ')})`);
console.log(`synthetic main entries      : 2 (cs + en)`);
console.log(`bundle assets copied        : ${assets}`);

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('ASSERTION FAILED: ' + msg);
    process.exit(1);
  }
}
assert(singleCount === singles.length, 'single count mismatch');
assert(bundleCount === psSlugs.length && bundleCount >= 1, 'bundle count mismatch');
// every declared singleton collection must have at least one entry file
for (const [, key] of singles) {
  assert(fs.existsSync(path.join(SRC, key, 'index.md')), `${key}/index.md missing`);
}
assert(fs.existsSync(path.join(SRC, 'podejte-stiznost/main/index.md')), 'cs main missing');
assert(fs.existsSync(path.join(SRC, 'podejte-stiznost-en/main/index.md')), 'en main missing');
// each bundle pic must have been copied
for (const slug of psSlugs) {
  const { data } = matter(fs.readFileSync(path.join(SRC, 'podejte-stiznost', slug, 'index.md'), 'utf8'));
  const pic = (data.contact as any)?.pic;
  if (pic && String(pic).startsWith('/media/')) {
    assert(fs.existsSync(path.join(ROOT, 'public', String(pic))), `asset missing for ${slug}: ${pic}`);
  }
}
console.log('OK — all assertions passed.');
