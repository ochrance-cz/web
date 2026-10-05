/**
 * Extract the `pristupnost` (Accessibility) collection family:
 *   - `pristupnost`        (cs)  — normalize every entry (flat or bundle) to a bundle
 *   - `pristupnost-gallery`(cs)  — split the `budova` gallery[] into child entries
 *   - `pristupnost-en`     (en)  — keep gallery inline
 *
 * Source (untouched): content/pristupnost/, content-en/pristupnost/
 * Output: src/content/pristupnost/**, src/content/pristupnost-en/**,
 *         public/media/pristupnost/**, public/media/pristupnost-en/**
 *
 * Idempotent. Run with: bun scripts/extract-pristupnost.ts
 */
import matter from 'gray-matter';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const KEEP_FIELDS = ['title', 'type', 'perex', 'hidePages', 'includeInSearchIndex', 'chapters'] as const;

function isBundleRelative(ref: string): boolean {
  return (
    !!ref &&
    !ref.startsWith('/') &&
    !/^https?:/i.test(ref) &&
    !ref.startsWith('mailto:') &&
    !ref.startsWith('tel:') &&
    !ref.startsWith('#') &&
    !ref.startsWith('data:')
  );
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

/** Remove generated output but preserve the foundation's `.gitkeep`. */
function cleanOutput(dir: string) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === '.gitkeep') continue;
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

/** Copy a bundle-relative binary into the media dir; return the absolute /media URL. */
function copyAsset(
  ref: string,
  bundleDir: string,
  mediaOutDir: string,
  mediaUrlBase: string,
  copied: Set<string>
): string {
  const decoded = decodeURIComponent(ref);
  const srcPath = join(bundleDir, decoded);
  if (!existsSync(srcPath)) {
    console.warn(`  ! missing asset: ${srcPath}`);
    return ref;
  }
  const destPath = join(mediaOutDir, decoded);
  ensureDir(dirname(destPath));
  copyFileSync(srcPath, destPath);
  copied.add(decoded);
  return `${mediaUrlBase}/${ref}`;
}

/** Rewrite bundle-relative refs in a markdown/HTML body, copying the binaries. */
function rewriteBody(
  body: string,
  bundleDir: string,
  mediaOutDir: string,
  mediaUrlBase: string,
  copied: Set<string>
): string {
  let out = body;
  // markdown image/link targets: ![alt](url) and [text](url)
  out = out.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\s*(?:"[^"]*")?\))/g, (m, pre, url, post) =>
    isBundleRelative(url) ? `${pre}${copyAsset(url, bundleDir, mediaOutDir, mediaUrlBase, copied)}${post}` : m
  );
  // raw HTML src="" / href=""
  out = out.replace(/(\b(?:src|href)\s*=\s*)("|')([^"']+)\2/gi, (m, pre, q, url) =>
    isBundleRelative(url) ? `${pre}${q}${copyAsset(url, bundleDir, mediaOutDir, mediaUrlBase, copied)}${q}` : m
  );
  return out;
}

function pick(data: Record<string, any>): Record<string, any> {
  const fm: Record<string, any> = {};
  for (const k of KEEP_FIELDS) if (data[k] !== undefined) fm[k] = data[k];
  return fm;
}

// ───────────────────────── CS ─────────────────────────
function extractCs() {
  const srcDir = join(ROOT, 'content/pristupnost');
  const outBase = join(ROOT, 'src/content/pristupnost');
  const mediaBase = join(ROOT, 'public/media/pristupnost');

  // wipe previous output (idempotent)
  cleanOutput(outBase);

  // discover entries (flat <slug>.md or <slug>/index.md), skip _index.*
  const entries: { slug: string; file: string; bundleDir: string }[] = [];
  for (const name of readdirSync(srcDir)) {
    if (name.startsWith('_index.')) continue;
    const full = join(srcDir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      const idx = ['index.md', 'index.mdx', 'index.markdown'].map((f) => join(full, f)).find(existsSync);
      if (idx) entries.push({ slug: name, file: idx, bundleDir: full });
    } else if (/\.(md|mdx|markdown)$/.test(name)) {
      entries.push({ slug: name.replace(/\.(md|mdx|markdown)$/, ''), file: full, bundleDir: srcDir });
    }
  }

  let galleryTotal = 0;
  for (const { slug, file, bundleDir } of entries) {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    const mediaOutDir = join(mediaBase, slug);
    const mediaUrlBase = `/media/pristupnost/${slug}`;
    const copied = new Set<string>();
    const fm = pick(data);

    // split gallery[] → child entries
    if (Array.isArray(data.gallery) && data.gallery.length > 0) {
      const galleryDir = join(outBase, slug, 'gallery');
      ensureDir(galleryDir);
      data.gallery.forEach((item: any, i: number) => {
        const order = i + 1;
        let pic = item.pic ?? '';
        if (isBundleRelative(pic)) pic = copyAsset(pic, bundleDir, mediaOutDir, mediaUrlBase, copied);
        const desc = (item.desc ?? '').toString().trim();
        const childBody = rewriteBody(desc, bundleDir, mediaOutDir, mediaUrlBase, copied) + '\n';
        const childFile = join(galleryDir, `${String(order).padStart(4, '0')}.md`);
        writeFileSync(childFile, matter.stringify(childBody, { pic, order }));
      });
      // assert children written to disk == source gallery length
      const written = readdirSync(galleryDir).filter((f) => /\.(md|mdx|markdown)$/.test(f)).length;
      if (written !== data.gallery.length)
        throw new Error(`${slug}: wrote ${written} gallery children, expected ${data.gallery.length}`);
      galleryTotal += written;
    }

    const body = rewriteBody(content, bundleDir, mediaOutDir, mediaUrlBase, copied);
    const outFile = join(outBase, slug, 'index.md');
    ensureDir(dirname(outFile));
    writeFileSync(outFile, matter.stringify(body, fm));
    console.log(`  cs ${slug} (${copied.size} assets)`);
  }

  console.log(`\ncs entries: ${entries.length}, gallery children: ${galleryTotal}`);
  return entries.length;
}

/** Count <slug>/index.* bundles actually written under a collection output dir. */
function countWritten(outBase: string): number {
  if (!existsSync(outBase)) return 0;
  return readdirSync(outBase).filter(
    (name) =>
      name !== '.gitkeep' &&
      statSync(join(outBase, name)).isDirectory() &&
      ['index.md', 'index.mdx', 'index.markdown'].some((f) => existsSync(join(outBase, name, f)))
  ).length;
}

// ───────────────────────── EN ─────────────────────────
function extractEn() {
  const srcDir = join(ROOT, 'content-en/pristupnost');
  const outBase = join(ROOT, 'src/content/pristupnost-en');
  const mediaBase = join(ROOT, 'public/media/pristupnost-en');

  cleanOutput(outBase);
  if (!existsSync(srcDir)) return 0;

  const entries: { slug: string; file: string; bundleDir: string }[] = [];
  for (const name of readdirSync(srcDir)) {
    if (name.startsWith('_index.')) continue;
    const full = join(srcDir, name);
    if (statSync(full).isDirectory()) {
      const idx = ['index.md', 'index.mdx', 'index.markdown'].map((f) => join(full, f)).find(existsSync);
      if (idx) entries.push({ slug: name, file: idx, bundleDir: full });
    }
  }

  for (const { slug, file, bundleDir } of entries) {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    const mediaOutDir = join(mediaBase, slug);
    const mediaUrlBase = `/media/pristupnost-en/${slug}`;
    const copied = new Set<string>();

    // keep gallery inline, rewrite pic paths
    const fm: Record<string, any> = { title: data.title };
    if (Array.isArray(data.gallery)) {
      fm.gallery = data.gallery.map((item: any) => {
        const out: any = {};
        if (item.pic !== undefined) {
          out.pic = isBundleRelative(item.pic)
            ? copyAsset(item.pic, bundleDir, mediaOutDir, mediaUrlBase, copied)
            : item.pic;
        }
        if (item.desc !== undefined)
          out.desc = rewriteBody(String(item.desc), bundleDir, mediaOutDir, mediaUrlBase, copied);
        return out;
      });
    }

    const body = rewriteBody(content, bundleDir, mediaOutDir, mediaUrlBase, copied);
    const outFile = join(outBase, slug, 'index.md');
    ensureDir(dirname(outFile));
    writeFileSync(outFile, matter.stringify(body, fm));
    console.log(`  en ${slug} (${copied.size} assets)`);
  }

  console.log(`\nen entries: ${entries.length}`);
  return entries.length;
}

console.log('=== extract pristupnost ===');
const csCount = extractCs();
const enCount = extractEn();

// source counts for assertion
const csSource = readdirSync(join(ROOT, 'content/pristupnost')).filter((n) => {
  if (n.startsWith('_index.')) return false;
  const full = join(ROOT, 'content/pristupnost', n);
  if (statSync(full).isDirectory())
    return ['index.md', 'index.mdx', 'index.markdown'].some((f) => existsSync(join(full, f)));
  return /\.(md|mdx|markdown)$/.test(n);
}).length;
const enSource = existsSync(join(ROOT, 'content-en/pristupnost'))
  ? readdirSync(join(ROOT, 'content-en/pristupnost')).filter((n) => {
      if (n.startsWith('_index.')) return false;
      const full = join(ROOT, 'content-en/pristupnost', n);
      return (
        statSync(full).isDirectory() &&
        ['index.md', 'index.mdx', 'index.markdown'].some((f) => existsSync(join(full, f)))
      );
    }).length
  : 0;

// written output bundles on disk
const csWritten = countWritten(join(ROOT, 'src/content/pristupnost'));
const enWritten = countWritten(join(ROOT, 'src/content/pristupnost-en'));

console.log(`\nassert cs written ${csWritten} == source ${csSource} (processed ${csCount})`);
if (csWritten !== csSource) throw new Error('cs count mismatch');
console.log(`assert en written ${enWritten} == source ${enSource} (processed ${enCount})`);
if (enWritten !== enSource) throw new Error('en count mismatch');
console.log('\nOK');
