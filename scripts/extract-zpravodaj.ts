#!/usr/bin/env bun
/**
 * Extract the `zpravodaj` (newsletter issues) collection from Hugo source into
 * the Astro content collection, splitting each issue's nested
 * `sections[].articles[]` into the `zpravodaj-articles` child collection.
 *
 * Source (read-only): content/zpravodaj/<slug>/index.{md,markdown}
 * Output:
 *   src/content/zpravodaj/<slug>/index.md           (frontmatter: title, month,
 *                                                    year, author, file, perex)
 *   src/content/zpravodaj/<slug>/articles/<NNNN>.md (frontmatter: title,
 *                                                    section, id, eso, order;
 *                                                    body = article body HTML)
 *   public/media/zpravodaj/<slug>/<file>            (bundle-relative assets)
 *
 * Idempotent. Run with: bun scripts/extract-zpravodaj.ts
 */
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const SRC_DIR = path.join(ROOT, 'content/zpravodaj');
const OUT_DIR = path.join(ROOT, 'src/content/zpravodaj');
const MEDIA_DIR = path.join(ROOT, 'public/media/zpravodaj');
const COLLECTION = 'zpravodaj';

interface Article {
  title?: string;
  id?: string;
  eso?: string;
  body?: string;
  [k: string]: unknown;
}
interface Section {
  title?: string;
  articles?: Article[];
}

/** Is this ref bundle-relative (must be copied + rewritten)? */
function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  const r = ref.trim();
  if (r.startsWith('/')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return false; // http:, https:, mailto:, data:, tel:
  if (r.startsWith('#')) return false;
  return true;
}

/**
 * Copy a bundle-relative asset to public/media/zpravodaj/<slug>/ and return the
 * rewritten absolute /media/... path. Absolute/external refs are returned
 * unchanged.
 */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // malformed escape (e.g. a literal "%") — use as-is
  }
}

function processRef(ref: string, slug: string, copied: Set<string>): string {
  if (!isBundleRelative(ref)) return ref;
  // strip any query/hash, decode for filesystem lookup + on-disk name
  const clean = ref.split(/[?#]/)[0];
  const decoded = safeDecode(clean);
  const fileName = path.basename(decoded);
  const candidates = [
    path.join(SRC_DIR, slug, clean),
    path.join(SRC_DIR, slug, decoded),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    console.warn(`  ! asset not found for ref "${ref}" in ${slug} — leaving as-is`);
    return ref;
  }
  const destDir = path.join(MEDIA_DIR, slug);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, fileName);
  fs.copyFileSync(found, dest);
  copied.add(`${slug}/${fileName}`);
  return `/media/${COLLECTION}/${slug}/${fileName}`;
}

/** Rewrite bundle-relative refs inside an HTML/markdown body string. */
function rewriteBody(body: string, slug: string, copied: Set<string>): string {
  if (!body) return body;
  let out = body;
  // HTML src="..." / href="..."
  out = out.replace(/(\b(?:src|href)=)(["'])(.*?)\2/gi, (m, attr, q, ref) => {
    const rewritten = processRef(ref, slug, copied);
    return `${attr}${q}${rewritten}${q}`;
  });
  // markdown ![alt](url) and [text](url)
  out = out.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\s*(?:"[^"]*")?\))/g, (m, pre, ref, post) => {
    const rewritten = processRef(ref, slug, copied);
    return `${pre}${rewritten}${post}`;
  });
  return out;
}

function findIndexFile(dir: string): string | null {
  const entries = fs.readdirSync(dir);
  const match = entries.find(
    (e) => /^index.*\.(md|markdown|mdx)$/.test(e) && !e.startsWith('_index')
  );
  return match ? path.join(dir, match) : null;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) throw new Error(`Source missing: ${SRC_DIR}`);

  const slugs = fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  // Prune stale output issue dirs (renamed/removed sources) for idempotency.
  if (fs.existsSync(OUT_DIR)) {
    const sourceSlugs = new Set(slugs);
    for (const d of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
      if (d.isDirectory() && !sourceSlugs.has(d.name)) {
        fs.rmSync(path.join(OUT_DIR, d.name), { recursive: true, force: true });
        console.log(`  - pruned stale issue dir: ${d.name}`);
      }
    }
  }

  let issueCount = 0;
  let articleCount = 0;
  let sourceArticleTotal = 0;
  const copied = new Set<string>();

  for (const slug of slugs) {
    const dir = path.join(SRC_DIR, slug);
    const indexFile = findIndexFile(dir);
    if (!indexFile) {
      console.warn(`! no index file in ${slug} — skipping`);
      continue;
    }

    const raw = fs.readFileSync(indexFile, 'utf8');
    const { data, content } = matter(raw);
    const sections: Section[] = Array.isArray(data.sections) ? data.sections : [];

    // ---- issue index.md (drop `sections`) ----
    const issueFm: Record<string, unknown> = { title: data.title };
    for (const key of ['month', 'year', 'author', 'file', 'perex'] as const) {
      if (data[key] !== undefined) {
        let val = data[key];
        if (key === 'file' && typeof val === 'string') {
          val = processRef(val, slug, copied);
        }
        issueFm[key] = val;
      }
    }

    const outIssueDir = path.join(OUT_DIR, slug);
    fs.mkdirSync(outIssueDir, { recursive: true });
    fs.writeFileSync(
      path.join(outIssueDir, 'index.md'),
      matter.stringify(content ?? '', issueFm)
    );
    issueCount++;

    // ---- articles (flatten across sections, preserve order) ----
    const articlesDir = path.join(outIssueDir, 'articles');
    fs.mkdirSync(articlesDir, { recursive: true });
    // clean stale article files (idempotency for shrinking issues)
    for (const f of fs.readdirSync(articlesDir)) {
      if (/\.(md|markdown|mdx)$/.test(f)) fs.rmSync(path.join(articlesDir, f));
    }

    let order = 0;
    let issueArticles = 0;
    for (const section of sections) {
      const arts = Array.isArray(section.articles) ? section.articles : [];
      sourceArticleTotal += arts.length;
      for (const art of arts) {
        order++;
        const artFm: Record<string, unknown> = { title: art.title ?? '', order };
        if (section.title !== undefined) artFm.section = section.title;
        if (art.id !== undefined && art.id !== '') artFm.id = art.id;
        if (art.eso !== undefined && art.eso !== '') artFm.eso = art.eso;

        const body = rewriteBody(typeof art.body === 'string' ? art.body : '', slug, copied);
        const nnnn = String(order).padStart(4, '0');
        fs.writeFileSync(
          path.join(articlesDir, `${nnnn}.md`),
          matter.stringify(body, artFm)
        );
        issueArticles++;
        articleCount++;
      }
    }
    console.log(`  ${slug}: ${issueArticles} articles`);
  }

  console.log(`\nIssues written:   ${issueCount}`);
  console.log(`Articles written: ${articleCount}`);
  console.log(`Source articles:  ${sourceArticleTotal}`);
  console.log(`Assets copied:    ${copied.size}`);

  if (articleCount !== sourceArticleTotal) {
    throw new Error(
      `ASSERT FAILED: articles written (${articleCount}) != source article total (${sourceArticleTotal})`
    );
  }
  console.log('\nOK — article counts match source.');
}

main();
