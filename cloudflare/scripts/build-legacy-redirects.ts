import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Rebuilds src/legacy-redirects.json: the redirects the old Apache served from the
// Hugo-generated .htaccess (hand-written `Redirect 301` lines plus one per page
// `oldUrl`) that the Astro build no longer answers. Needs a fresh `bun run build`:
//
//   bun cloudflare/scripts/build-legacy-redirects.ts [old-repo-ref]
//
// An `oldUrl` leads to the page that declares it; where that page moved, the old
// server is asked where the URL goes today. A target is kept only when the build
// (or the CDN behind its redirect rules) really has it.
const ref = process.argv[2] ?? 'origin/main';
const LEGACY = 'https://www.soubory.ochrance.cz';
const OWN_ORIGINS = [LEGACY, 'https://www.ochrance.cz', 'http://www.ochrance.cz'];
// Served by the Worker from the old server, so they exist without being in the build.
const LEGACY_FILE_PREFIXES = ['/uploads-import/', '/uploads-deti/'];
const root = join(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const output = join(import.meta.dirname, '../src/legacy-redirects.json');

if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/ is missing. Run `bun run build` first.');

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const stripSlash = (path: string) => path.replace(/\/+$/, '') || '/';
const isExternal = (target: string) => /^https?:\/\//.test(target);
const isFile = (path: string) => existsSync(path) && statSync(path).isFile();

/** Own absolute URL → path; anything else stays as it is. */
function localize(target: string): string {
  const origin = OWN_ORIGINS.find(candidate => target.startsWith(candidate));
  return origin ? target.slice(origin.length) || '/' : target;
}

// The build's own _redirects: exact rules, and the placeholder rules that send
// page-bundle files to the CDN.
const exactRules = new Map<string, string>();
const patternRules: Array<{ pattern: RegExp; to: string }> = [];
for (const line of readFileSync(join(dist, '_redirects'), 'utf8').split('\n')) {
  const [from, to, code] = line.trim().split(/\s+/);
  if (!from?.startsWith('/') || !to || code === '200') continue;
  if (!from.includes('*') && !from.includes('/:')) {
    exactRules.set(stripSlash(from), to);
    continue;
  }
  const source = from
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([a-z]+)/g, '(?<$1>[^/]+)')
    .replace('*', '(?<splat>.*)');
  patternRules.push({ pattern: new RegExp(`^${source}$`), to });
}

/** Destination of the first placeholder rule matching `path`, as the asset layer would send it. */
function applyPatternRule(path: string): string | null {
  for (const { pattern, to } of patternRules) {
    const groups = path.match(pattern)?.groups;
    if (groups) return to.replace(/:([a-z]+)/g, (_, name: string) => groups[name] ?? '');
  }
  return null;
}

async function existsOnCdn(url: string): Promise<boolean> {
  const response = await fetch(encodeURI(decodeURI(url)), { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
  return response.ok;
}

/** Where the build answers `target`, or null when it would be a 404. */
async function resolveInBuild(target: string): Promise<string | null> {
  if (isExternal(target)) return target;
  const [path, suffix = ''] = target.split(/(?=[?#])/, 2);
  const decoded = decodeURI(path);
  if (LEGACY_FILE_PREFIXES.some(prefix => decoded.startsWith(prefix))) return target;
  if (isFile(join(dist, decoded, 'index.html'))) return `${stripSlash(path)}/${suffix}`.replace(/^\/\//, '/');
  if (isFile(join(dist, decoded))) return target;
  const exact = exactRules.get(stripSlash(decoded));
  if (exact) return exact;
  const onCdn = applyPatternRule(decoded);
  return onCdn && (await existsOnCdn(onCdn)) ? onCdn : null;
}

async function legacyLocation(path: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(LEGACY + encodeURI(decodeURI(path)), {
        redirect: 'manual',
        headers: { 'User-Agent': 'ochrance-legacy-redirects/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      await response.body?.cancel();
      return response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

async function pool<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]);
      }
    })
  );
  return results;
}

// Hand-written rules: the declared target is used, because Apache's prefix matching
// sends some of them to concatenated paths that 404 on production as well.
const declared = new Map<string, string>();
for (const line of git('show', `${ref}:layouts/index.htaccess`).split('\n')) {
  const match = line.match(/^Redirect 301 (\/\S*) (\S+)\s*$/);
  if (match) declared.set(stripSlash(match[1]), match[2]);
}

// oldUrl → the page that declares it: content/a/b/index.md is /a/b/, content-en/… is /en/….
const oldUrls = new Map<string, string>();
for (const line of git('grep', '-E', '^oldUrl:', ref, '--', 'content', 'content-en').split('\n')) {
  const match = line.match(/:(content(?:-en)?)\/(.+?)(?:\/_?index)?\.(?:md|markdown):oldUrl:\s*(.*)$/);
  if (!match) continue;
  const value = match[3].replace(/^["']|["']$/g, '').trim();
  if (value.startsWith('/')) oldUrls.set(stripSlash(value), `${match[1] === 'content-en' ? '/en' : ''}/${match[2]}/`);
}

// URLs told apart only by a query string cannot be keys; the Worker's path rewrites cover them.
const sources = [...new Set([...declared.keys(), ...oldUrls.keys()])]
  .filter(from => from !== '/' && !from.includes('?'))
  .sort();
const dropped: string[] = [];
let alreadyServed = 0;

const entries = await pool(sources, 8, async (from): Promise<[string, string] | null> => {
  // A page, a file or an exact redirect of the new build wins over the old rule.
  const decoded = decodeURI(from);
  if (isFile(join(dist, decoded, 'index.html')) || isFile(join(dist, decoded)) || exactRules.has(decoded)) {
    alreadyServed++;
    return null;
  }
  const candidates = [declared.get(from), oldUrls.get(from)].filter(candidate => candidate !== undefined);
  for (const candidate of candidates) {
    const resolved = await resolveInBuild(localize(candidate));
    if (resolved && stripSlash(resolved) !== from) return [from, resolved];
  }
  // The page moved or has its own permalink: follow what production answers today.
  const legacy = await legacyLocation(from);
  const resolved = legacy ? await resolveInBuild(localize(legacy)) : null;
  if (!resolved || stripSlash(resolved) === from) {
    dropped.push(`${from} -> ${legacy ?? candidates[0] ?? '(no redirect on the old server)'}`);
    return null;
  }
  return [from, resolved];
});

const kept = entries.filter(entry => entry !== null);
// Hugo published the sitemap under this name; Astro calls it sitemap-index.xml.
if (!isFile(join(dist, 'sitemap.xml')) && isFile(join(dist, 'sitemap-index.xml'))) {
  kept.push(['/sitemap.xml', '/sitemap-index.xml']);
}
const redirects = Object.fromEntries(kept.sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(output, `${JSON.stringify(redirects, null, 2)}\n`);

console.log(`Sources: ${sources.length} (${declared.size} hand-written, ${oldUrls.size} oldUrl)`);
console.log(`Written: ${Object.keys(redirects).length} redirects to ${output}`);
console.log(`Already served by the new build: ${alreadyServed}`);
console.log(`Dropped, target missing in the new build: ${dropped.length}`);
for (const line of dropped.sort()) console.log(`  ${line}`);
