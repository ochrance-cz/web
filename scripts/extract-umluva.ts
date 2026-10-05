#!/usr/bin/env bun
/**
 * extract-umluva.ts — migrate the `umluva` collection (CRPD articles, cs only).
 *
 * Source : content/umluva/<slug>/index.md           (Hugo page bundles)
 * Target : src/content/umluva/<slug>/index.md
 *
 * Bodies are raw TYPO3 HTML. Per the MIGRATION.md asset rule:
 *  - bundle-relative refs (no leading "/", not http(s):/mailto:/#) in body
 *    <img src>/<a href> and markdown ![](x)/[..](x) → copy the binary to
 *    public/media/umluva/<slug>/<file> and rewrite to /media/umluva/<slug>/<file>.
 *  - absolute refs (/uploads-import/... — the mp4 videos + pics) and external
 *    URLs are left UNCHANGED.
 *  - shortcodes (e.g. {{< youtube … >}}) are left AS-IS.
 *
 * Idempotent: safe to re-run. Skips _index.*. Prints + asserts counts.
 */

import {
  readdirSync,
  statSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dir, '..');
const SRC_DIR = join(ROOT, 'content', 'umluva');
const OUT_DIR = join(ROOT, 'src', 'content', 'umluva');
const MEDIA_DIR = join(ROOT, 'public', 'media', 'umluva');
const COLLECTION = 'umluva';

function isBundleRelative(ref: string): boolean {
  if (!ref) return false;
  const r = ref.trim();
  if (r.startsWith('/')) return false; // absolute (server-served) — leave
  if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return false; // http:, https:, mailto:, data:, tel:
  if (r.startsWith('#')) return false; // in-page anchor
  if (r.startsWith('{{')) return false; // shortcode fragment — leave
  return true;
}

/** Rewrite body asset refs, copying bundle binaries. Returns [newBody, copiedCount]. */
function processBody(body: string, slug: string, bundleDir: string): [string, number] {
  let copied = 0;
  const seen = new Set<string>();

  const handle = (ref: string): string => {
    if (!isBundleRelative(ref)) return ref;
    // split the on-disk filename from any ?query/#hash suffix (kept on the URL).
    const suffixMatch = ref.match(/[?#].*$/);
    const suffix = suffixMatch ? suffixMatch[0] : '';
    const clean = suffix ? ref.slice(0, ref.length - suffix.length) : ref;
    // refuse empty (query-only) and path-traversal refs — they'd resolve to a
    // directory or escape the bundle/media tree.
    if (!clean || clean.startsWith('../') || clean.includes('/../')) {
      console.warn(`  ! skipping unsafe bundle ref, leaving as-is: ${ref} (${slug})`);
      return ref;
    }
    const srcFile = join(bundleDir, clean);
    if (!existsSync(srcFile) || !statSync(srcFile).isFile()) {
      console.warn(`  ! bundle ref not found on disk, leaving as-is: ${ref} (${slug})`);
      return ref;
    }
    const destFile = join(MEDIA_DIR, slug, clean);
    if (!seen.has(srcFile)) {
      mkdirSync(dirname(destFile), { recursive: true });
      copyFileSync(srcFile, destFile);
      copied++;
      seen.add(srcFile);
    }
    return `/media/${COLLECTION}/${slug}/${clean}${suffix}`;
  };

  let out = body;
  // HTML attrs: src="..." / href="..." (single or double quoted)
  out = out.replace(/\b(src|href)=("|')([^"']+)\2/gi, (m, attr, q, ref) => {
    const next = handle(ref);
    return next === ref ? m : `${attr}=${q}${next}${q}`;
  });
  // Markdown images/links: ![alt](ref) and [text](ref)
  out = out.replace(/(!?\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, label, ref, title) => {
    const next = handle(ref);
    return next === ref ? m : `${label}(${next}${title ?? ''})`;
  });

  return [out, copied];
}

function main() {
  if (!existsSync(SRC_DIR)) throw new Error(`source dir missing: ${SRC_DIR}`);

  const slugs = readdirSync(SRC_DIR).filter((name) => {
    const p = join(SRC_DIR, name);
    return statSync(p).isDirectory();
  });

  let written = 0;
  let totalCopied = 0;

  for (const slug of slugs) {
    const idx = join(SRC_DIR, slug, 'index.md');
    if (!existsSync(idx)) {
      console.warn(`  ! no index.md in ${slug}, skipping`);
      continue;
    }
    const raw = readFileSync(idx, 'utf8');
    const { data, content } = matter(raw);
    const [newBody, copied] = processBody(content, slug, join(SRC_DIR, slug));
    totalCopied += copied;

    const outFile = join(OUT_DIR, slug, 'index.md');
    mkdirSync(dirname(outFile), { recursive: true });
    const serialized = matter.stringify(newBody, data);
    writeFileSync(outFile, serialized);
    written++;
  }

  // The section _index (title/perex + intro body with a YouTube shortcode) is NOT a
  // collection entry (the bundle loader matches */index.*), but the listing route needs
  // it. Emit it verbatim into src/content so the route reads from src/, not the legacy
  // content/ tree. Its body is processed for assets too (slug = '_index').
  const srcIndex = join(SRC_DIR, '_index.markdown');
  if (existsSync(srcIndex)) {
    const { data, content } = matter(readFileSync(srcIndex, 'utf8'));
    const [body, copied] = processBody(content, '_index', SRC_DIR);
    totalCopied += copied;
    const outIndex = join(OUT_DIR, '_index.markdown');
    mkdirSync(dirname(outIndex), { recursive: true });
    writeFileSync(outIndex, matter.stringify(body, data));
  } else {
    console.warn('  ! no _index.markdown in source');
  }

  // Source article count = subdirectories (excludes _index.markdown, a flat file).
  const sourceCount = slugs.length;
  console.log(`umluva: source articles=${sourceCount} written=${written} assets copied=${totalCopied}`);

  if (written !== sourceCount) {
    throw new Error(`count mismatch: wrote ${written} of ${sourceCount}`);
  }
  console.log('umluva: OK');
}

main();
