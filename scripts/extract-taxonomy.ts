/**
 * extract-taxonomy.ts — copy Hugo taxonomy TERM pages into Astro content.
 *
 * Taxonomies handled (term def = content/<tax>/<term>/_index.{md,markdown}):
 *   situace      (cs)  ← content/situace
 *   vystupy      (cs)  ← content/vystupy
 *   situace-en   (en)  ← content-en/situace
 *
 * For each term:
 *   - read frontmatter + body with gray-matter
 *   - keep only the schema-allowed frontmatter keys (see content.config.ts)
 *   - copy this term's OWN bundle binaries → public/media/<tax>/<term>/ and
 *     rewrite bundle-relative refs (illustration + body img/link) to /media/...
 *   - leave absolute (/images/…) and external refs unchanged; leave shortcodes
 *   - write src/content/<tax>/<term>/index.md (CMS-editable page bundle)
 *
 * Idempotent (safe to re-run). Prints counts; asserts output == source.
 * Run: bun scripts/extract-taxonomy.ts
 */
import matter from 'gray-matter';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface Tax {
  /** collection key (= public/media subdir + src/content subdir) */
  key: string;
  /** source dir holding <term>/_index.* */
  src: string;
  /** schema-allowed frontmatter keys (extra keys are dropped) */
  fields: string[];
}

const TAXONOMIES: Tax[] = [
  { key: 'situace', src: 'content/situace', fields: ['title', 'slug', 'questionTitle', 'perex', 'illustration'] },
  { key: 'situace-en', src: 'content-en/situace', fields: ['title', 'slug', 'questionTitle', 'perex', 'illustration'] },
  { key: 'vystupy', src: 'content/vystupy', fields: ['title', 'plural', 'slug', 'listed', 'perex', 'illustration', 'media'] },
];

const TERM_INDEX = /^_index\.(md|markdown|mdx)$/;

/** A ref is bundle-relative when it has no leading '/', is not an URL/mailto/anchor. */
function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  const r = ref.trim();
  return !(r.startsWith('/') || /^https?:\/\//i.test(r) || r.startsWith('mailto:') || r.startsWith('#') || r.startsWith('data:'));
}

function findTermIndex(dir: string): string | null {
  for (const f of readdirSync(dir)) {
    if (TERM_INDEX.test(f)) return f;
  }
  return null;
}

let totalSrc = 0;
let totalOut = 0;
let totalAssets = 0;

for (const tax of TAXONOMIES) {
  const srcDir = join(ROOT, tax.src);
  if (!existsSync(srcDir)) {
    console.warn(`! source dir missing: ${tax.src}`);
    continue;
  }
  const outBase = join(ROOT, 'src/content', tax.key);
  const mediaBase = join(ROOT, 'public/media', tax.key);

  const terms = readdirSync(srcDir).filter((name) => {
    const p = join(srcDir, name);
    return statSync(p).isDirectory(); // skip the section-level _index.markdown
  });

  let srcCount = 0;
  let outCount = 0;

  for (const term of terms) {
    const termDir = join(srcDir, term);
    const indexName = findTermIndex(termDir);
    if (!indexName) {
      console.warn(`! ${tax.key}/${term}: no _index file, skipping`);
      continue;
    }
    srcCount++;

    const raw = readFileSync(join(termDir, indexName), 'utf8');
    const parsed = matter(raw);
    const data: Record<string, unknown> = parsed.data ?? {};
    let body = parsed.content ?? '';

    // 1) copy this term's own bundle binaries → public/media/<key>/<term>/
    const assetFiles = readdirSync(termDir).filter((f) => !TERM_INDEX.test(f) && statSync(join(termDir, f)).isFile());
    if (assetFiles.length > 0) {
      const dest = join(mediaBase, term);
      mkdirSync(dest, { recursive: true });
      for (const f of assetFiles) {
        copyFileSync(join(termDir, f), join(dest, f));
        totalAssets++;
      }
    }
    const rewriteRef = (ref: string): string => {
      const r = ref.trim();
      if (!isBundleRelative(r)) return ref;
      // only rewrite refs that point at a file we actually copied (basename match)
      const base = r.replace(/^\.\//, '').split('/').pop()!;
      if (assetFiles.includes(base)) return `/media/${tax.key}/${term}/${base}`;
      return ref; // leave unknown bundle-relative refs as-is (e.g. shortcode targets)
    };

    // 2) rewrite frontmatter illustration (string path) if bundle-relative
    if (typeof data.illustration === 'string') {
      data.illustration = rewriteRef(data.illustration);
    }

    // 3) rewrite body refs: markdown ![](x)/[..](x), raw <img src>/<a href>
    body = body
      .replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (_m, pre, ref, post) => pre + rewriteRef(ref) + post)
      .replace(/(<(?:img|a)\b[^>]*?\b(?:src|href)=")([^"]+)(")/gi, (_m, pre, ref, post) => pre + rewriteRef(ref) + post);

    // 4) keep only schema-allowed frontmatter keys
    const outData: Record<string, unknown> = {};
    for (const k of tax.fields) {
      if (data[k] !== undefined) outData[k] = data[k];
    }

    const outDir = join(outBase, term);
    mkdirSync(outDir, { recursive: true });
    const out = matter.stringify(body, outData);
    writeFileSync(join(outDir, 'index.md'), out);
    outCount++;
  }

  // Independent on-disk verification: count emitted index.md files.
  const onDisk = existsSync(outBase)
    ? readdirSync(outBase).filter((d) => {
        const p = join(outBase, d);
        return statSync(p).isDirectory() && existsSync(join(p, 'index.md'));
      }).length
    : 0;

  console.log(`${tax.key}: ${srcCount} source → ${outCount} written (${onDisk} on disk)`);
  if (srcCount !== outCount || onDisk !== outCount) {
    throw new Error(`COUNT MISMATCH for ${tax.key}: source=${srcCount} written=${outCount} onDisk=${onDisk}`);
  }
  totalSrc += srcCount;
  totalOut += outCount;
}

console.log(`\nTOTAL: ${totalSrc} terms → ${totalOut} written, ${totalAssets} bundle assets copied`);
if (totalSrc !== totalOut) throw new Error(`TOTAL COUNT MISMATCH: ${totalSrc} != ${totalOut}`);
console.log('OK');
