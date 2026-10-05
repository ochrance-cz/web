/**
 * Extract the `letaky` (cs) and `letaky-en` (en) collections from the Hugo
 * source (`content/letaky/**`, `content-en/letaky/**`) into the Astro content
 * tree (`src/content/letaky/**`, `src/content/letaky-en/**`).
 *
 * Asset rule: bundle-relative refs (`file`, `seeing`, `roma`, `kids`,
 * `attachments[].file`, and any markdown/HTML refs in the body) are copied to
 * `public/media/<key>/<folder>/<basename>` and rewritten to the absolute path
 * `/media/<key>/<folder>/<basename>`. Absolute (`/...`) and external
 * (`http(s):`, `mailto:`) refs are left untouched. `situace` is kept as-is.
 *
 * Idempotent: clears the output dirs first, then re-emits. Prints counts and
 * asserts output count == source count per collection.
 *
 * Run: `bun run scripts/extract-letaky.ts`
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

interface Unit {
  key: string; // on-disk collection key (output folder under src/content + public/media)
  srcDir: string; // absolute path to Hugo source section dir
}

const UNITS: Unit[] = [
  { key: 'letaky', srcDir: join(ROOT, 'content', 'letaky') },
  { key: 'letaky-en', srcDir: join(ROOT, 'content-en', 'letaky') },
];

/** True for bundle-relative refs that must be copied + rewritten. */
function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  return !/^(https?:|mailto:|tel:|\/|#|data:)/i.test(ref);
}

/**
 * Copy a bundle-relative asset into public/media and return its rewritten
 * absolute path. Non-bundle-relative refs are returned unchanged.
 */
function rewriteRef(ref: string, srcEntryDir: string, key: string, folder: string, copied: Set<string>): string {
  if (!isBundleRelative(ref)) return ref;
  const name = basename(ref);
  const from = join(srcEntryDir, ref);
  if (!existsSync(from)) {
    console.warn(`  ! missing bundle asset: ${key}/${folder} -> ${ref}`);
    return ref;
  }
  const destDir = join(ROOT, 'public', 'media', key, folder);
  mkdirSync(destDir, { recursive: true });
  copyFileSync(from, join(destDir, name));
  copied.add(join(key, folder, name));
  return `/media/${key}/${folder}/${name}`;
}

/** Rewrite markdown `![](x)` / `[..](x)` and raw HTML `src="x"` / `href="x"` refs in a body. */
function rewriteBody(body: string, srcEntryDir: string, key: string, folder: string, copied: Set<string>): string {
  let out = body.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\s*(?:"[^"]*")?\))/g, (_m, pre, url, post) => {
    return pre + rewriteRef(url, srcEntryDir, key, folder, copied) + post;
  });
  out = out.replace(/(\b(?:src|href)\s*=\s*")([^"]+)(")/gi, (_m, pre, url, post) => {
    return pre + rewriteRef(url, srcEntryDir, key, folder, copied) + post;
  });
  return out;
}

function processUnit(unit: Unit): { src: number; out: number } {
  const { key, srcDir } = unit;
  const outDir = join(ROOT, 'src', 'content', key);
  const mediaDir = join(ROOT, 'public', 'media', key);

  // Idempotent: start clean. Remove generated entry subdirs but preserve any
  // top-level placeholder files (e.g. the foundation's `.gitkeep`).
  if (existsSync(outDir)) {
    for (const name of readdirSync(outDir)) {
      const p = join(outDir, name);
      if (statSync(p).isDirectory()) rmSync(p, { recursive: true, force: true });
    }
  }
  rmSync(mediaDir, { recursive: true, force: true });

  if (!existsSync(srcDir)) throw new Error(`source dir not found: ${srcDir}`);

  const folders = readdirSync(srcDir).filter((f) => {
    const p = join(srcDir, f);
    return statSync(p).isDirectory();
  });

  // Only folders that contain an index.{md,mdx,markdown} are collection entries.
  const ENTRY_NAMES = ['index.md', 'index.mdx', 'index.markdown'];
  const copied = new Set<string>();
  let srcCount = 0;
  let outCount = 0;

  for (const folder of folders) {
    const srcEntryDir = join(srcDir, folder);
    const indexName = ENTRY_NAMES.find((n) => existsSync(join(srcEntryDir, n)));
    if (!indexName) continue; // asset-only / orphan dir — skip
    srcCount++;

    const raw = readFileSync(join(srcEntryDir, indexName), 'utf8');
    const parsed = matter(raw);
    const data = parsed.data as Record<string, any>;

    // Rewrite single-file frontmatter asset fields.
    for (const field of ['file', 'seeing', 'roma', 'kids']) {
      if (typeof data[field] === 'string') {
        data[field] = rewriteRef(data[field], srcEntryDir, key, folder, copied);
      }
    }
    // Rewrite attachments[].file
    if (Array.isArray(data.attachments)) {
      for (const att of data.attachments) {
        if (att && typeof att.file === 'string') {
          att.file = rewriteRef(att.file, srcEntryDir, key, folder, copied);
        }
      }
    }

    // Rewrite body refs (bodies are usually empty; handled defensively).
    const body = rewriteBody(parsed.content, srcEntryDir, key, folder, copied);

    const outEntryDir = join(outDir, folder);
    mkdirSync(outEntryDir, { recursive: true });
    writeFileSync(join(outEntryDir, 'index.md'), matter.stringify(body, data));
    outCount++;
  }

  console.log(`\n[${key}] source entries: ${srcCount}, written: ${outCount}, assets copied: ${copied.size}`);
  if (srcCount !== outCount) throw new Error(`[${key}] count mismatch: src ${srcCount} != out ${outCount}`);
  return { src: srcCount, out: outCount };
}

let total = 0;
for (const unit of UNITS) {
  const { out } = processUnit(unit);
  total += out;
}
console.log(`\nDone. Total leaflet entries written: ${total}`);
