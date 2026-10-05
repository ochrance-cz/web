/**
 * Extract the `eso` collection (Evidence of Ombudsman's Stances — overview pages).
 *
 * Source (read-only): content/eso/<slug>/index.md (Hugo page bundles, cs only).
 * Output:            src/content/eso/<slug>/index.md  (+ frontmatter re-emit)
 *                    public/media/eso/<slug>/<file>   (bundle binaries)
 *
 * Asset rule: bundle-relative refs (no leading `/`, not http(s)/mailto/#) in the
 * `illustration` frontmatter field AND in the body are copied into
 * public/media/eso/<slug>/ and rewritten to absolute /media/eso/<slug>/<file>.
 * Absolute and external refs are left unchanged.
 *
 * Idempotent: safe to re-run. Prints counts and asserts output == source.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dir, '..');
const SRC_DIR = path.join(ROOT, 'content', 'eso');
const OUT_DIR = path.join(ROOT, 'src', 'content', 'eso');
const MEDIA_DIR = path.join(ROOT, 'public', 'media', 'eso');

// Bundle-relative = a local file next to index.md: no leading `/`, no URI
// scheme (http:, https:, mailto:, tel:, data:, …), not a fragment.
const isBundleRelative = (ref: string): boolean =>
  !!ref &&
  !ref.startsWith('/') &&
  !ref.startsWith('#') &&
  !/^[a-z][a-z0-9+.-]*:/i.test(ref);

async function copyAsset(slug: string, srcSlugDir: string, ref: string): Promise<string> {
  // Strip any query/hash for the on-disk lookup; keep base name.
  const clean = ref.replace(/[?#].*$/, '');
  const fileName = path.basename(clean);
  const from = path.join(srcSlugDir, clean);
  const to = path.join(MEDIA_DIR, slug, fileName);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
  return `/media/eso/${slug}/${fileName}`;
}

/** Rewrite bundle-relative refs in body markdown + raw HTML. */
async function rewriteBody(slug: string, srcSlugDir: string, body: string, copied: Set<string>): Promise<string> {
  // markdown images/links: ![alt](ref) and [text](ref)
  const mdRef = /(!?\[[^\]]*\]\()([^)\s]+)(\))/g;
  // raw HTML src="..." / href="..."
  const htmlRef = /((?:src|href)\s*=\s*")([^"]+)(")/gi;

  const tasks: Promise<void>[] = [];
  const replace = (full: string, pre: string, ref: string, post: string): string => {
    if (!isBundleRelative(ref)) return full;
    const newRef = `/media/eso/${slug}/${path.basename(ref.replace(/[?#].*$/, ''))}`;
    tasks.push(
      copyAsset(slug, srcSlugDir, ref).then((r) => {
        copied.add(r);
      })
    );
    return `${pre}${newRef}${post}`;
  };

  let out = body.replace(mdRef, (f, a, b, c) => replace(f, a, b, c));
  out = out.replace(htmlRef, (f, a, b, c) => replace(f, a, b, c));
  await Promise.all(tasks);
  return out;
}

async function main() {
  const entries = await fs.readdir(SRC_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  let srcCount = 0;
  let outCount = 0;
  const assets: string[] = [];

  for (const slug of slugs) {
    const srcSlugDir = path.join(SRC_DIR, slug);
    const files = await fs.readdir(srcSlugDir);
    // Bundle index can be index.md / index.mdx / index.markdown. _index.* are
    // list-page content and are not bundle entries (handled in the route).
    const indexName = files.find((f) => /^index\.(md|mdx|markdown)$/.test(f));
    if (!indexName) continue;
    const indexPath = path.join(srcSlugDir, indexName);
    srcCount++;

    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = matter(raw);
    const data = { ...parsed.data } as Record<string, unknown>;
    const copied = new Set<string>();

    // illustration frontmatter ref
    if (typeof data.illustration === 'string' && isBundleRelative(data.illustration)) {
      const newRef = await copyAsset(slug, srcSlugDir, data.illustration);
      copied.add(newRef);
      data.illustration = newRef;
    }

    const body = await rewriteBody(slug, srcSlugDir, parsed.content, copied);
    assets.push(...copied);

    const outSlugDir = path.join(OUT_DIR, slug);
    await fs.mkdir(outSlugDir, { recursive: true });
    const outRaw = matter.stringify(body, data);
    await fs.writeFile(path.join(outSlugDir, 'index.md'), outRaw, 'utf8');
    outCount++;
  }

  console.log(`eso: source dirs with index.md = ${srcCount}`);
  console.log(`eso: written entries           = ${outCount}`);
  console.log(`eso: assets copied             = ${assets.length}`);
  for (const a of assets) console.log(`  ${a}`);

  if (srcCount !== outCount) {
    throw new Error(`Count mismatch: source ${srcCount} != output ${outCount}`);
  }
  console.log('eso: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
