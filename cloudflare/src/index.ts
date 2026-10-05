import legacyRedirects from './legacy-redirects.json';

// The site itself is static: Cloudflare serves `dist/` without running this code.
// The Worker only covers what the old Apache did around the site: the file trees
// the office still uploads to on the old server, and redirects from retired URLs.
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Old server, reachable only under this name: the www host now points to Cloudflare. */
  LEGACY_ORIGIN: string;
  /** R2 snapshot of the legacy file trees, used when the old server has no answer. */
  CDN_ASSETS: string;
}

interface Context {
  waitUntil(promise: Promise<unknown>): void;
}

const redirects: Record<string, string> = legacyRedirects;

// Live on the old server only: files keep arriving there after the R2 snapshot.
// Keep in sync with `run_worker_first` in wrangler.jsonc.
const LEGACY_FILE_PREFIXES = ['/uploads-import/', '/uploads-deti/'];

// The RewriteRules of the old .htaccess. The event archive was addressed by a
// TYPO3 query string, which the old server dropped as well.
const LEGACY_PATH_REWRITES: Array<{ pattern: RegExp; to: string; dropQuery?: boolean }> = [
  { pattern: /^\/fileadmin\/user_upload\/(.*)$/, to: '/uploads-import/$1' },
  { pattern: /^\/uploads\/(.*)$/, to: '/uploads-import/uploads/$1' },
  { pattern: /^\/vystupy\/publikace\/stanoviska\/(.*)$/, to: '/vystupy/edice-stanoviska/$1' },
  { pattern: /^\/dalsi-aktivity\/archiv-vzdelavacich-akci.*$/, to: '/vzdelavaci-akce/', dropQuery: true },
];

const LEGACY_TIMEOUT_MS = 10_000;
// Cache API refuses bigger objects on Free/Pro; the videos in /uploads-import/ go straight through.
const MAX_CACHED_BYTES = 100 * 1024 * 1024;
// One hour at the edge so a file replaced under the same name shows up the same day.
const FILE_CACHE_CONTROL = 'public, max-age=86400, s-maxage=3600';

export default {
  async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
    const url = new URL(request.url);

    // First, as on the old server: an old leaflet URL leads to its current version,
    // not to the stale file the path rewrite below would find.
    const target = redirects[url.pathname.replace(/\/+$/, '') || '/'];
    if (target) return redirect(target + (target.includes('?') ? '' : url.search));

    for (const { pattern, to, dropQuery } of LEGACY_PATH_REWRITES) {
      if (pattern.test(url.pathname)) {
        return redirect(url.pathname.replace(pattern, to) + (dropQuery ? '' : url.search));
      }
    }

    if (LEGACY_FILE_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) {
      return serveLegacyFile(request, url, env, ctx);
    }

    // Nothing of ours: the asset layer still applies its own _redirects.
    const response = await env.ASSETS.fetch(request);
    return response.status === 404 ? notFound(url, env) : response;
  },
};

async function serveLegacyFile(request: Request, url: URL, env: Env, ctx: Context): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  // The query string never selected a different file on the old server.
  const cacheUrl = url.origin + url.pathname;
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(new Request(cacheUrl, { headers: conditionalHeaders(request) }));
  if (cached) return forMethod(request, withSource(cached, 'cache'));

  const legacy = await fetchFile(env.LEGACY_ORIGIN + url.pathname, request);
  if (legacy && legacy.status >= 300 && legacy.status < 400 && legacy.status !== 304) {
    return rewriteLegacyRedirect(legacy, env);
  }
  if (legacy && isFile(legacy)) {
    return forMethod(request, store(legacy, 'legacy', request, cacheUrl, cache, ctx));
  }

  const snapshot = await fetchFile(env.CDN_ASSETS + url.pathname, request);
  if (snapshot && isFile(snapshot)) {
    return forMethod(request, store(snapshot, 'cdn', request, cacheUrl, cache, ctx));
  }

  // A file that may well exist must not be reported as gone just because the old server is down.
  const legacyIsDown = !legacy || legacy.status >= 500 || legacy.status === 429;
  if (legacyIsDown) {
    return new Response('Soubor je dočasně nedostupný.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '300', 'Cache-Control': 'no-store' },
    });
  }
  return notFound(url, env);
}

// `not_found_handling` would answer before this Worker gets to look up an old URL,
// so the site's 404 page is served from here instead.
async function notFound(url: URL, env: Env): Promise<Response> {
  const page = await env.ASSETS.fetch(new Request(new URL('/404', url)));
  return new Response(page.body, { status: 404, headers: page.headers });
}

async function fetchFile(target: string, request: Request): Promise<Response | null> {
  const controller = new AbortController();
  // Guards the wait for headers only; a large download must not be cut off mid-stream.
  const timer = setTimeout(() => controller.abort(), LEGACY_TIMEOUT_MS);
  try {
    return await fetch(target, {
      headers: conditionalHeaders(request),
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function conditionalHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ['Range', 'If-Range', 'If-None-Match', 'If-Modified-Since']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function isFile(response: Response): boolean {
  return response.status === 200 || response.status === 206 || response.status === 304;
}

function store(
  origin: Response,
  source: string,
  request: Request,
  cacheUrl: string,
  cache: Cache,
  ctx: Context
): Response {
  const response = withSource(origin, source);
  if (origin.status !== 304) response.headers.set('Cache-Control', FILE_CACHE_CONTROL);

  const size = Number(origin.headers.get('Content-Length') ?? Number.POSITIVE_INFINITY);
  if (origin.status === 200 && request.method === 'GET' && size <= MAX_CACHED_BYTES) {
    ctx.waitUntil(cache.put(cacheUrl, response.clone()));
  }
  return response;
}

function withSource(origin: Response, source: string): Response {
  const response = new Response(origin.body, origin);
  response.headers.set('X-Ochrance-Source', source);
  return response;
}

function forMethod(request: Request, response: Response): Response {
  return request.method === 'HEAD' ? new Response(null, response) : response;
}

function rewriteLegacyRedirect(legacy: Response, env: Env): Response {
  const location = legacy.headers.get('Location') ?? '/';
  // The old server only knows itself by the name we reach it under.
  const target = location.startsWith(env.LEGACY_ORIGIN) ? location.slice(env.LEGACY_ORIGIN.length) || '/' : location;
  return redirect(target, legacy.status);
}

function redirect(location: string, status = 301): Response {
  return new Response(null, { status, headers: { Location: location } });
}
