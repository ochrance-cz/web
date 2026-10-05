/**
 * Extract the `projekty` (cs) + `projekty-en` (en) collection family from the
 * Hugo source bundles into Astro content collections.
 *
 * - Reads content/projekty/<slug>/index.md (+ content-en/projekty/...).
 * - Re-emits frontmatter + body to src/content/<key>/<slug>/index.md.
 * - Copies bundle-relative binaries (illustration.pic, partners[].logo,
 *   gallery[].pic, and body <img>/<a>/markdown refs) into
 *   public/media/<key>/<slug>/ and rewrites the refs to absolute /media/... paths.
 * - Absolute (/...) and external (http(s)://, mailto:, #) refs are left as-is.
 *
 * Idempotent. Run with: bun scripts/extract-projekty.ts
 */
import { readdirSync, statSync, readFileSync, mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import matter from 'gray-matter';

const ROOT = dirname(import.meta.dir);

interface Unit {
  key: string;
  srcDir: string;
  outDir: string;
  mediaDir: string;
}

const UNITS: Unit[] = [
  {
    key: 'projekty',
    srcDir: join(ROOT, 'content/projekty'),
    outDir: join(ROOT, 'src/content/projekty'),
    mediaDir: join(ROOT, 'public/media/projekty'),
  },
  {
    key: 'projekty-en',
    srcDir: join(ROOT, 'content-en/projekty'),
    outDir: join(ROOT, 'src/content/projekty-en'),
    mediaDir: join(ROOT, 'public/media/projekty-en'),
  },
];

/** A ref is bundle-relative if it is not absolute, external, anchor or protocol. */
function isBundleRelative(ref: string): boolean {
  const r = ref.trim();
  if (!r) return false;
  if (/^(https?:)?\/\//i.test(r)) return false; // http(s):// or //
  if (/^(mailto:|tel:|#)/i.test(r)) return false;
  if (r.startsWith('/')) return false; // absolute path
  return true;
}

/** Copy one bundle file into the media dir; returns the new absolute /media ref or null if missing. */
function copyAsset(srcEntryDir: string, mediaEntryDir: string, mediaUrlBase: string, ref: string): string | null {
  const clean = decodeURIComponent(ref.trim());
  const abs = join(srcEntryDir, clean);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  mkdirSync(mediaEntryDir, { recursive: true });
  const fileName = clean.split('/').pop()!;
  copyFileSync(abs, join(mediaEntryDir, fileName));
  return `${mediaUrlBase}/${fileName}`;
}

/** Escape a string for use in a RegExp. */
function rx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let totalAssets = 0;

function rewriteBody(body: string, srcEntryDir: string, mediaEntryDir: string, mediaUrlBase: string): string {
  // Collect candidate refs from markdown images/links and raw HTML src/href.
  const refs = new Set<string>();
  const patterns = [
    /!?\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g, // markdown ![..](x) / [..](x)
    /\bsrc\s*=\s*"([^"]+)"/g,
    /\bsrc\s*=\s*'([^']+)'/g,
    /\bhref\s*=\s*"([^"]+)"/g,
    /\bhref\s*=\s*'([^']+)'/g,
  ];
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(body)) !== null) refs.add(m[1]);
  }

  let out = body;
  for (const ref of refs) {
    if (!isBundleRelative(ref)) continue;
    const newRef = copyAsset(srcEntryDir, mediaEntryDir, mediaUrlBase, ref);
    if (!newRef) {
      console.warn(`  ! body ref not found, left as-is: ${ref}`);
      continue;
    }
    totalAssets++;
    // Escape `$` in the replacement so it is not treated as a group reference.
    const safe = newRef.replace(/\$/g, '$$$$');
    // Replace within the precise delimiters to avoid accidental substring hits.
    out = out
      .replace(new RegExp(`\\](\\(\\s*)${rx(ref)}(\\s*(?:\\s+"[^"]*")?\\))`, 'g'), `]$1${safe}$2`)
      .replace(new RegExp(`(src\\s*=\\s*")${rx(ref)}(")`, 'g'), `$1${safe}$2`)
      .replace(new RegExp(`(src\\s*=\\s*')${rx(ref)}(')`, 'g'), `$1${safe}$2`)
      .replace(new RegExp(`(href\\s*=\\s*")${rx(ref)}(")`, 'g'), `$1${safe}$2`)
      .replace(new RegExp(`(href\\s*=\\s*')${rx(ref)}(')`, 'g'), `$1${safe}$2`);
  }
  return out;
}

/** Rewrite a single frontmatter image string field. */
function rewriteField(value: unknown, srcEntryDir: string, mediaEntryDir: string, mediaUrlBase: string): unknown {
  if (typeof value !== 'string' || !value.trim()) return value;
  if (!isBundleRelative(value)) return value;
  const newRef = copyAsset(srcEntryDir, mediaEntryDir, mediaUrlBase, value);
  if (!newRef) {
    console.warn(`  ! frontmatter ref not found, left as-is: ${value}`);
    return value;
  }
  totalAssets++;
  return newRef;
}

function processUnit(unit: Unit): number {
  const { srcDir, outDir, mediaDir, key } = unit;
  if (!existsSync(srcDir)) {
    console.warn(`source dir missing: ${srcDir}`);
    return 0;
  }

  // Fully idempotent: wipe this unit's previously-generated entry dirs + media so
  // a re-run after a slug change or a removed source bundle leaves no orphans.
  // Only remove subdirectories (keep files like the foundation's .gitkeep).
  const removeSubdirs = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) rmSync(p, { recursive: true, force: true });
    }
  };
  removeSubdirs(outDir);
  removeSubdirs(mediaDir);

  const slugs = readdirSync(srcDir).filter((name) => {
    const p = join(srcDir, name);
    return statSync(p).isDirectory();
  });

  let count = 0;
  for (const folder of slugs) {
    const srcEntryDir = join(srcDir, folder);
    // index file (skip _index.* handled implicitly: those live at the section root, not in subdirs)
    const indexFile = ['index.md', 'index.mdx', 'index.markdown'].map((f) => join(srcEntryDir, f)).find(existsSync);
    if (!indexFile) {
      console.warn(`  no index in ${srcEntryDir}, skipping`);
      continue;
    }

    const raw = readFileSync(indexFile, 'utf8');
    const { data, content } = matter(raw);

    // Choose output slug: frontmatter slug override (Hugo behaviour) else folder name.
    const slug = (typeof data.slug === 'string' && data.slug.trim()) ? data.slug.trim() : folder;
    const mediaEntryDir = join(mediaDir, slug);
    const mediaUrlBase = `/media/${key}/${slug}`;

    // Reset this entry's media dir to keep idempotent (no stale files).
    if (existsSync(mediaEntryDir)) rmSync(mediaEntryDir, { recursive: true, force: true });

    // Rewrite frontmatter image fields (only when the field is actually a string).
    if (data.illustration && typeof data.illustration === 'object' && typeof data.illustration.pic === 'string') {
      data.illustration.pic = rewriteField(data.illustration.pic, srcEntryDir, mediaEntryDir, mediaUrlBase);
    }
    if (Array.isArray(data.partners)) {
      for (const p of data.partners) {
        if (p && typeof p === 'object' && typeof p.logo === 'string') {
          p.logo = rewriteField(p.logo, srcEntryDir, mediaEntryDir, mediaUrlBase);
        }
      }
    }
    if (Array.isArray(data.gallery)) {
      for (const g of data.gallery) {
        if (g && typeof g === 'object' && typeof g.pic === 'string') {
          g.pic = rewriteField(g.pic, srcEntryDir, mediaEntryDir, mediaUrlBase);
        }
      }
    }

    // Rewrite body refs.
    const newBody = rewriteBody(content, srcEntryDir, mediaEntryDir, mediaUrlBase);

    // Write output.
    const outEntryDir = join(outDir, slug);
    mkdirSync(outEntryDir, { recursive: true });
    writeFileSync(join(outEntryDir, 'index.md'), matter.stringify(newBody, data));
    count++;
  }

  return count;
}

// ---- run ----
const counts: Record<string, number> = {};
for (const unit of UNITS) {
  const srcCount = existsSync(unit.srcDir)
    ? readdirSync(unit.srcDir).filter((n) => statSync(join(unit.srcDir, n)).isDirectory()).length
    : 0;
  const out = processUnit(unit);
  counts[unit.key] = out;
  console.log(`${unit.key}: ${out} entries (source dirs: ${srcCount})`);
  if (out !== srcCount) {
    throw new Error(`COUNT MISMATCH for ${unit.key}: wrote ${out}, expected ${srcCount}`);
  }
}
console.log(`Total assets copied/rewritten: ${totalAssets}`);
console.log('Done.');
