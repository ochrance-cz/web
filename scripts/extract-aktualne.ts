/**
 * Extract the `aktualne` (news) collection family from Hugo source into Astro content.
 *
 * Source (read-only):  content/aktualne/<slug>/index.md          (cs)
 *                      content-en/aktualne/<slug>/index.md       (en)
 * Output:              src/content/aktualne/<slug>/index.md      (cs)
 *                      src/content/aktualne-en/<slug>/index.md   (en)
 *                      public/media/aktualne/<slug>/<file>       (copied bundle binaries)
 *                      public/media/aktualne-en/<slug>/<file>
 *
 * Imported HTML in bodies/perexes is converted to editor-friendly Markdown and
 * implementation-shaped frontmatter names are replaced by editorial names. Bundle-
 * relative assets are copied to public/media/<key>/<slug>/<file> and rewritten to
 * absolute paths. Absolute/external refs and shortcodes remain unchanged.
 *
 * Run: bun scripts/extract-aktualne.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { editorMarkdown } from './lib/editor-markdown';

const ROOT = path.resolve(import.meta.dir, '..');

interface Unit {
  src: string; // source dir relative to ROOT
  key: string; // output collection key
}
const UNITS: Unit[] = [
  { src: 'content/aktualne', key: 'aktualne' },
  { src: 'content-en/aktualne', key: 'aktualne-en' },
];

let totalEntries = 0;
let totalCopied = 0;

/** Decode a ref to a bundle-relative local path, or null if it is not a local candidate. */
function localCandidate(ref: string): string | null {
  if (!ref) return null;
  // scheme (http:, mailto:, file:, data:, tel: …), protocol-relative //, absolute /, anchor #
  if (/^([a-zA-Z][a-zA-Z0-9+.\-]*:|\/\/|\/|#)/.test(ref)) return null;
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    decoded = clean;
  }
  return decoded;
}

function makeRewriter(bundleDir: string, key: string, slug: string) {
  return function rewriteRef(ref: string): string {
    const cand = localCandidate(ref);
    if (cand === null) return ref;
    const srcFile = path.join(bundleDir, cand);
    if (!fs.existsSync(srcFile) || !fs.statSync(srcFile).isFile()) return ref;
    const dest = path.join(ROOT, 'public', 'media', key, slug, cand);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(srcFile, dest);
    totalCopied++;
    const encoded = cand.split('/').map(encodeURIComponent).join('/');
    return `/media/${key}/${slug}/${encoded}`;
  };
}

/** Rewrite asset refs inside a markdown/HTML body string. */
function rewriteBody(body: string, rewrite: (r: string) => string): string {
  // Markdown images and links: ![alt](url "title") / [text](url "title")
  body = body.replace(
    /(!?)\[([^\]]*)\]\(\s*([^)\s]+)((?:\s+"[^"]*")?)\s*\)/g,
    (_m, bang, label, url, title) => `${bang}[${label}](${rewrite(url)}${title})`,
  );
  // HTML src="…" / href="…" (double quotes)
  body = body.replace(
    /\b(src|href)="([^"]*)"/gi,
    (_m, attr, url) => `${attr}="${rewrite(url)}"`,
  );
  // HTML src='…' / href='…' (single quotes)
  body = body.replace(
    /\b(src|href)='([^']*)'/gi,
    (_m, attr, url) => `${attr}='${rewrite(url)}'`,
  );
  return body;
}

for (const unit of UNITS) {
  const srcDir = path.join(ROOT, unit.src);
  const outDir = path.join(ROOT, 'src', 'content', unit.key);
  let count = 0;
  let copiedBefore = totalCopied;

  const dirs = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const slug of dirs) {
    const bundleDir = path.join(srcDir, slug);
    // index.{md,mdx,markdown}; skip dirs without an index (incomplete entries)
    const indexName = ['index.md', 'index.mdx', 'index.markdown'].find((n) =>
      fs.existsSync(path.join(bundleDir, n)),
    );
    if (!indexName) continue;

    const raw = fs.readFileSync(path.join(bundleDir, indexName), 'utf8');
    const parsed = matter(raw);
    const data: Record<string, any> = parsed.data;
    const rewrite = makeRewriter(bundleDir, unit.key, slug);

    // Frontmatter asset fields: illustration (string) + attachments[].file + attachmentsHidden[].file
    if (typeof data.illustration === 'string') {
      data.illustration = rewrite(data.illustration);
    }
    for (const field of ['attachments', 'attachmentsHidden']) {
      if (Array.isArray(data[field])) {
        for (const item of data[field]) {
          if (item && typeof item.file === 'string') item.file = rewrite(item.file);
        }
      }
    }

    if (typeof data.perex === 'string') data.perex = editorMarkdown(data.perex);

    const hasCategories = 'vystupy' in data;
    const categories = Array.isArray(data.vystupy)
      ? data.vystupy.map((item: string | { slug?: string }) => typeof item === 'string' ? item : item?.slug).filter(Boolean)
      : data.vystupy;
    delete data.vystupy;
    if (unit.key === 'aktualne') {
      if (hasCategories) data.kategorie = categories;
      if ('illustration' in data) {
        data.obrazek = data.illustration;
        delete data.illustration;
      }
      if ('attachments' in data) {
        data.prilohy = data.attachments;
        delete data.attachments;
      }
      if ('attachmentsHidden' in data) {
        data.skrytePrilohy = data.attachmentsHidden;
        delete data.attachmentsHidden;
      }
    } else {
      if (hasCategories) data.categories = categories;
    }

    const body = editorMarkdown(rewriteBody(parsed.content, rewrite));
    if (body) data.body = body;
    const output = matter.stringify('', data);

    const destDir = path.join(outDir, slug);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, 'index.md'), output);
    count++;
  }

  totalEntries += count;
  console.log(
    `${unit.key}: ${count} entries written, ${totalCopied - copiedBefore} binaries copied`,
  );

  // Assert output count == source count (dirs with an index file)
  const srcCount = dirs.filter((slug) =>
    ['index.md', 'index.mdx', 'index.markdown'].some((n) =>
      fs.existsSync(path.join(srcDir, slug, n)),
    ),
  ).length;
  if (count !== srcCount) {
    throw new Error(`${unit.key}: output ${count} != source ${srcCount}`);
  }
  const writtenCount = fs
    .readdirSync(outDir, { withFileTypes: true })
    .filter((d) => d.isDirectory()).length;
  if (writtenCount !== srcCount) {
    throw new Error(`${unit.key}: on-disk ${writtenCount} != source ${srcCount}`);
  }
}

console.log(`TOTAL: ${totalEntries} entries, ${totalCopied} binaries copied.`);
