/**
 * One-off/idempotent cleanup of the collections editors actively maintain.
 *
 * - turns imported raw HTML bodies/perexes into rich-editor-friendly Markdown
 * - stores page text in a typed `body` field and emits YAML data entries, so Nua
 *   shows only the schema-driven form and no separate full-page body editor
 * - replaces Aktuality's implementation-shaped frontmatter names with editorial ones
 * - preserves every URL, slug and rendered-content field through schema transforms
 *
 * Run: bun scripts/clean-editor-content.ts
 */
import { readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, relative } from 'node:path';
import matter from 'gray-matter';
import { parse, stringify } from 'yaml';
import { editorMarkdown, hasLegacyHtml } from './lib/editor-markdown';

const ROOT = join(import.meta.dir, '..');

interface CleanupStats {
  files: number;
  bodies: number;
  fields: number;
  categories: number;
}

function markdownFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...markdownFiles(path));
    else if (/\.(md|markdown|mdx|json|yaml|yml)$/.test(entry)) result.push(path);
  }
  return result.sort();
}

function isCollectionEntry(path: string): boolean {
  const name = basename(path);
  if (/^_index\./.test(name)) return false;
  if (/^index\.(?:md|markdown|mdx|json|yaml|yml)$/.test(name)) return true;
  const rel = relative(join(ROOT, 'src/content'), path);
  if (rel.split('/').length === 2 && /\.(?:md|markdown|mdx|json|yaml|yml)$/.test(name)) return true;
  return /\/(?:articles|timeline|gallery)\/[^/]+\.(?:md|markdown|mdx|json|yaml|yml)$/.test(rel);
}

function cleanCollection(collection: string, kind: 'news' | 'news-en' | 'page'): CleanupStats {
  const stats: CleanupStats = { files: 0, bodies: 0, fields: 0, categories: 0 };
  const dir = join(ROOT, 'src/content', collection);

  for (const path of markdownFiles(dir)) {
    // `_index.md` files are retained legacy migration inputs, not Astro/Nua entries.
    if (!isCollectionEntry(path)) continue;
    const raw = readFileSync(path, 'utf8');
    const isJsonFile = /\.json$/.test(path);
    const isDataFile = isJsonFile || /\.ya?ml$/.test(path);
    const parsed = isDataFile
      ? { data: ((isJsonFile ? JSON.parse(raw) : parse(raw)) ?? {}) as Record<string, unknown>, content: '' }
      : matter(raw);
    const data = { ...parsed.data } as Record<string, unknown>;
    const sourceBody = typeof data.body === 'string' ? data.body : parsed.content;
    let body = sourceBody;
    let changed = false;

    const cleanBody = editorMarkdown(body);
    if (cleanBody !== body.trim()) {
      body = cleanBody;
      stats.bodies++;
      changed = true;
    }

    if (body.trim()) {
      if (data.body !== body) changed = true;
      data.body = body;
    } else if ('body' in data) {
      delete data.body;
      changed = true;
    }
    if (parsed.content.trim()) changed = true;

    if (typeof data.perex === 'string' && hasLegacyHtml(data.perex)) {
      data.perex = editorMarkdown(data.perex);
      stats.fields++;
      changed = true;
    }

    if (kind === 'news' || kind === 'news-en') {
      if (typeof data.routeSlug !== 'string' || !data.routeSlug) {
        data.routeSlug = /^index\./.test(basename(path))
          ? basename(dirname(path))
          : basename(path).replace(/\.(?:md|markdown|mdx|json|ya?ml)$/, '');
        changed = true;
      }
      if ('vystupy' in data) {
        data[kind === 'news' ? 'kategorie' : 'categories'] = Array.isArray(data.vystupy)
          ? data.vystupy.map((item) => typeof item === 'string' ? item : (item as { slug?: string })?.slug).filter(Boolean)
          : data.vystupy;
        delete data.vystupy;
        stats.categories++;
        changed = true;
      }
      if (kind === 'news' && 'illustration' in data) {
        data.obrazek = data.illustration;
        delete data.illustration;
        changed = true;
      }
      if (kind === 'news' && 'attachments' in data) {
        data.prilohy = data.attachments;
        delete data.attachments;
        changed = true;
      }
      if (kind === 'news' && 'attachmentsHidden' in data) {
        data.skrytePrilohy = data.attachmentsHidden;
        delete data.attachmentsHidden;
        changed = true;
      }
    }

    const pathParts = relative(contentRoot, path).split('/');
    const isBundleIndex = pathParts.length === 3 && /^index\./.test(basename(path));
    const sourceSlug = isBundleIndex ? basename(dirname(path)) : '';
    const fileSlug = Buffer.byteLength(`${sourceSlug}.yaml`) > 240
      ? `${sourceSlug.slice(0, 180)}-${createHash('sha256').update(sourceSlug).digest('hex').slice(0, 12)}`
      : sourceSlug;
    const outputPath = isBundleIndex
      ? join(dirname(dirname(path)), `${fileSlug}.yaml`)
      : path.replace(/\.(?:md|markdown|mdx|json|ya?ml)$/, '.yaml');
    const output = stringify(data, { lineWidth: 0 });
    if (!changed && path === outputPath && raw === output) continue;
    writeFileSync(outputPath, output);
    if (path !== outputPath) {
      rmSync(path);
      if (isBundleIndex) {
        try { rmdirSync(dirname(path)); } catch { /* keep directories containing assets */ }
      }
    }
    stats.files++;
  }

  return stats;
}

const contentRoot = join(ROOT, 'src/content');
const collections = readdirSync(contentRoot)
  .filter((name) => statSync(join(contentRoot, name)).isDirectory())
  .sort();

for (const collection of collections) {
  const kind = collection === 'aktualne'
    ? 'news'
    : collection === 'aktualne-en'
      ? 'news-en'
      : 'page';
  const stats = cleanCollection(collection, kind);
  if (stats.files > 0) {
    console.log(`${collection}: ${stats.files} files, ${stats.bodies} bodies, ${stats.fields} fields, ${stats.categories} category lists`);
  }
}
