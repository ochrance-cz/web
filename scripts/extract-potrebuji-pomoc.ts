#!/usr/bin/env bun
/**
 * Extract the `potrebuji-pomoc` collection family (cs + en) from Hugo page
 * bundles into Astro content collections.
 *
 * - Reads `content/potrebuji-pomoc/<slug>/index.md` (cs) and
 *   `content-en/potrebuji-pomoc/<slug>/index.md` (en) with gray-matter.
 * - Writes `src/content/<key>/<slug>/index.md`, re-emitting frontmatter + body.
 * - Copies bundle-relative binaries to `public/media/<key>/<slug>/` and rewrites
 *   refs to absolute `/media/...`. Bundle-relative refs that actually live in
 *   `public/images` or `public/media` (Hugo global images) are rewritten to
 *   those absolute paths instead.
 * - Maps the Hugo `button.text` field to the schema's `button.title`.
 * - Idempotent. Prints counts and asserts output == source.
 */
import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import matter from 'gray-matter';

const ROOT = join(import.meta.dir, '..');
const PUBLIC = join(ROOT, 'public');

interface Unit {
  src: string; // source bundle dir
  key: string; // target collection key
}

const UNITS: Unit[] = [
  { src: 'content/potrebuji-pomoc', key: 'potrebuji-pomoc' },
  { src: 'content-en/potrebuji-pomoc', key: 'potrebuji-pomoc-en' },
];

let copied = 0;
const warnings: string[] = [];

function isExternalOrAbsolute(ref: string): boolean {
  return /^(\/|https?:|mailto:|tel:|#|data:)/i.test(ref);
}

/** Resolve and (if needed) copy a single bundle-relative asset ref. */
function makeRefRewriter(slugDir: string, key: string, slug: string) {
  return (ref: string): string => {
    if (!ref || isExternalOrAbsolute(ref)) return ref;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) return ref;
    const base = basename(clean);
    const srcPath = join(slugDir, clean);
    if (existsSync(srcPath) && statSync(srcPath).isFile()) {
      const destDir = join(PUBLIC, 'media', key, slug);
      mkdirSync(destDir, { recursive: true });
      copyFileSync(srcPath, join(destDir, base));
      copied++;
      return `/media/${key}/${slug}/${base}`;
    }
    if (existsSync(join(PUBLIC, 'images', base))) return `/images/${base}`;
    if (existsSync(join(PUBLIC, 'media', base))) return `/media/${base}`;
    warnings.push(`[${key}/${slug}] unresolved asset ref: ${ref}`);
    return ref;
  };
}

function rewriteString(s: string, rew: (r: string) => string): string {
  if (typeof s !== 'string') return s;
  // markdown images / links: ![alt](url) or [text](url)
  s = s.replace(/(!?\[[^\]]*\]\()\s*([^)\s]+)([^)]*\))/g, (_m, p1, url, p3) => p1 + rew(url) + p3);
  // raw HTML src / href attributes
  s = s.replace(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi, (_m, attr, q, url) => `${attr}=${q}${rew(url)}${q}`);
  // bare whole-string asset ref (e.g. illustration: foo.jpg)
  const t = s.trim();
  if (t && !/\s/.test(t) && /\.[a-z0-9]{2,5}$/i.test(t)) {
    const r = rew(t);
    if (r !== t) s = s.replace(t, r);
  }
  return s;
}

function walk(v: unknown, rew: (r: string) => string): unknown {
  if (typeof v === 'string') return rewriteString(v, rew);
  if (Array.isArray(v)) return v.map((x) => walk(x, rew));
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of Object.keys(o)) o[k] = walk(o[k], rew);
    return o;
  }
  return v;
}

let total = 0;
for (const unit of UNITS) {
  const srcRoot = join(ROOT, unit.src);
  if (!existsSync(srcRoot)) {
    console.error(`Missing source dir: ${srcRoot}`);
    process.exit(1);
  }
  const slugs = readdirSync(srcRoot).filter((d) => {
    const full = join(srcRoot, d);
    return statSync(full).isDirectory() && existsSync(join(full, 'index.md'));
  });

  let written = 0;
  for (const slug of slugs) {
    const slugDir = join(srcRoot, slug);
    const raw = readFileSync(join(slugDir, 'index.md'), 'utf8');
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;

    // Map Hugo button.text -> schema button.title
    const button = data.button as Record<string, unknown> | undefined;
    if (button && typeof button.text === 'string') {
      button.title = button.text;
      delete button.text;
    }

    const rew = makeRefRewriter(slugDir, unit.key, slug);
    walk(data, rew);
    const body = rewriteString(parsed.content, rew);

    const outDir = join(ROOT, 'src', 'content', unit.key, slug);
    mkdirSync(outDir, { recursive: true });
    const out = matter.stringify(body, data);
    writeFileSync(join(outDir, 'index.md'), out);
    written++;
  }

  console.log(`${unit.key}: source=${slugs.length} written=${written}`);
  if (written !== slugs.length) {
    console.error(`COUNT MISMATCH for ${unit.key}: ${written} != ${slugs.length}`);
    process.exit(1);
  }
  total += written;
}

console.log(`Total entries written: ${total}, assets copied: ${copied}`);
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log('  ' + w);
}
// Expected: cs=6, en=5
if (total !== 11) {
  console.error(`Expected 11 total entries, got ${total}`);
  process.exit(1);
}
