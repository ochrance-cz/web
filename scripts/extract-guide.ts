/**
 * extract-guide.ts — migrate the "guide" group collections from Hugo bundles
 * into Astro content collections.
 *
 * Collections:
 *   - srozumitelne  (cs, ~72 numbered chapters, body uses callout + sloupce shortcodes)
 *   - nas-pribeh    (cs, 1 entry "our story")
 *
 * Source : content/<sec>/<slug>/index.md
 * Output : src/content/<key>/<slug>/index.md
 *
 * Asset rule: bundle-relative refs (no leading "/", not http(s):, mailto:, #) in
 * frontmatter strings AND the body that point at a real file in the bundle are
 * copied to public/media/<key>/<slug>/<file> and rewritten to /media/<key>/<slug>/<file>.
 * Absolute and external refs are left unchanged.
 *
 * Idempotent. Prints counts and asserts output == source.
 *
 * Run: bun run scripts/extract-guide.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dir, '..');

interface Section {
  src: string; // content/<src>
  key: string; // src/content/<key>
}

const SECTIONS: Section[] = [
  { src: 'srozumitelne', key: 'srozumitelne' },
  { src: 'nas-pribeh', key: 'nas-pribeh' },
];

const isBundleRelative = (ref: string): boolean =>
  !!ref &&
  !ref.startsWith('/') &&
  !/^https?:\/\//i.test(ref) &&
  !ref.startsWith('mailto:') &&
  !ref.startsWith('#') &&
  !ref.startsWith('data:');

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rewrite bundle-relative refs in a string, copying the referenced binaries.
 * Matches markdown `![](x)` / `[..](x)`, optionally angle-bracketed `(<x>)`, and
 * raw HTML `src="x"` / `href="x"`.
 */
async function processRefs(
  text: string,
  srcDir: string,
  key: string,
  slug: string,
  mediaDir: string,
): Promise<{ out: string; copied: number }> {
  let copied = 0;
  const replacements: { from: string; to: string }[] = [];

  const handle = async (rawRef: string): Promise<string | null> => {
    // strip an optional surrounding angle bracket pair and url fragment/query
    const ref = rawRef.trim();
    const cleaned = ref.replace(/^<|>$/g, '');
    if (!isBundleRelative(cleaned)) return null;
    const decoded = decodeURIComponent(cleaned.split(/[?#]/)[0]);
    const srcFile = path.join(srcDir, decoded);
    if (!(await exists(srcFile))) return null; // not a real bundle file (e.g. footnote text)
    const fileName = path.basename(decoded);
    await fs.mkdir(mediaDir, { recursive: true });
    await fs.copyFile(srcFile, path.join(mediaDir, fileName));
    copied++;
    return `/media/${key}/${slug}/${fileName}`;
  };

  // markdown links/images: [..](ref) or [..](<ref>)
  const mdRe = /(!?\[[^\]]*\]\()(<[^>]+>|[^)\s]+)(\))/g;
  let m: RegExpExecArray | null;
  const pending: Promise<void>[] = [];
  while ((m = mdRe.exec(text))) {
    const full = m[0];
    const prefix = m[1];
    const refPart = m[2];
    const suffix = m[3];
    pending.push(
      (async () => {
        const to = await handle(refPart);
        if (to) replacements.push({ from: full, to: `${prefix}${to}${suffix}` });
      })(),
    );
  }

  // raw HTML src="ref" / href="ref"
  const htmlRe = /(src|href)\s*=\s*"([^"]+)"/g;
  while ((m = htmlRe.exec(text))) {
    const full = m[0];
    const attr = m[1];
    const refPart = m[2];
    pending.push(
      (async () => {
        const to = await handle(refPart);
        if (to) replacements.push({ from: full, to: `${attr}="${to}"` });
      })(),
    );
  }

  await Promise.all(pending);

  let out = text;
  for (const r of replacements) out = out.split(r.from).join(r.to);
  return { out, copied };
}

async function processFrontmatter(
  data: Record<string, unknown>,
  srcDir: string,
  key: string,
  slug: string,
  mediaDir: string,
): Promise<number> {
  let copied = 0;
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== 'string') continue;
    if (!isBundleRelative(v)) continue;
    const decoded = decodeURIComponent(v.split(/[?#]/)[0]);
    const srcFile = path.join(srcDir, decoded);
    if (!(await exists(srcFile))) continue;
    const fileName = path.basename(decoded);
    await fs.mkdir(mediaDir, { recursive: true });
    await fs.copyFile(srcFile, path.join(mediaDir, fileName));
    data[k] = `/media/${key}/${slug}/${fileName}`;
    copied++;
  }
  return copied;
}

async function extractSection(sec: Section): Promise<{ srcCount: number; outCount: number; copied: number }> {
  const srcRoot = path.join(ROOT, 'content', sec.src);
  const outRoot = path.join(ROOT, 'src', 'content', sec.key);
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });

  let srcCount = 0;
  let outCount = 0;
  let copied = 0;

  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const srcDir = path.join(srcRoot, slug);
    // find index.{md,mdx,markdown} — skip dirs without one (e.g. asset-only test dirs)
    let indexFile: string | null = null;
    for (const ext of ['md', 'mdx', 'markdown']) {
      const cand = path.join(srcDir, `index.${ext}`);
      if (await exists(cand)) {
        indexFile = cand;
        break;
      }
    }
    if (!indexFile) continue;
    srcCount++;

    const raw = await fs.readFile(indexFile, 'utf8');
    const parsed = matter(raw);
    const data = { ...parsed.data } as Record<string, unknown>;
    const mediaDir = path.join(ROOT, 'public', 'media', sec.key, slug);

    copied += await processFrontmatter(data, srcDir, sec.key, slug, mediaDir);
    const bodyRes = await processRefs(parsed.content, srcDir, sec.key, slug, mediaDir);
    copied += bodyRes.copied;

    const outDir = path.join(outRoot, slug);
    await fs.mkdir(outDir, { recursive: true });
    const outStr = matter.stringify(bodyRes.out, data);
    await fs.writeFile(path.join(outDir, 'index.md'), outStr, 'utf8');
    outCount++;
  }

  return { srcCount, outCount, copied };
}

async function main() {
  let totalCopied = 0;
  for (const sec of SECTIONS) {
    const { srcCount, outCount, copied } = await extractSection(sec);
    totalCopied += copied;
    console.log(
      `[${sec.key}] source=${srcCount} written=${outCount} assets=${copied}`,
    );
    if (srcCount !== outCount) {
      throw new Error(`[${sec.key}] count mismatch: source=${srcCount} written=${outCount}`);
    }
  }
  console.log(`Done. Total assets copied: ${totalCopied}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
