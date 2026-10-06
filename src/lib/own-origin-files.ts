import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { FILE_PATH } from '../../cloudflare/src/file-path';

/** Where the files moved out of the repository live. Its paths mirror the site's. */
export const CDN_ASSETS = 'https://cdn.nuasite.com/assets/ochrance-web-lj8h86';

// A URL ends where the next one starts: Markdown left in summaries glues links together.
const CDN_URL = new RegExp(
  `(href="|src=")?${CDN_ASSETS.replace(/[.]/g, '\\.')}(/(?:(?!https?://)[^\\s"'<>\\\\])*)`,
  'g'
);
// What pages embed stays on the CDN: every view would otherwise run the Worker.
const EMBEDDED_MEDIA = /\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|mp3)(?![\w.%-])/i;
const TEXT_OUTPUT = /\.(?:html|md|xml|json)$/;

/**
 * Points links to files at the site itself. A link (`href`) becomes a path on the
 * site when the Worker would look it up; an embedded file (`src`) never moves. A
 * URL anywhere else (feeds, visible text) gets the site's origin unless it is media.
 */
export function rewriteFileUrls(text: string, siteOrigin: string): string {
  return text.replace(CDN_URL, (url: string, attribute: string | undefined, path: string) => {
    if (attribute === 'src="') return url;
    if (attribute) return FILE_PATH.test(path.replace(/[?#].*$/, '')) ? attribute + path : url;
    return EMBEDDED_MEDIA.test(path) ? url : siteOrigin + path;
  });
}

function decoded(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/**
 * Keeps old file URLs on the site: a rule that sends a path to its own copy on
 * the CDN is dropped, so the Worker answers it; any other CDN target becomes a
 * site path.
 */
export function rewriteRedirects(text: string): string {
  return text
    .split('\n')
    .flatMap(line => {
      const [from, to, ...rest] = line.trim().split(/\s+/);
      if (!to?.startsWith(CDN_ASSETS)) return [line];
      const path = to.slice(CDN_ASSETS.length);
      // Compared decoded: a rule that differs only in escaping would redirect a path to itself.
      return decoded(path) === decoded(from.replace('*', ':splat')) ? [] : [[from, path, ...rest].join(' ')];
    })
    .join('\n');
}

/**
 * Content links to files by their CDN address, which is what works in Nua
 * previews. On Cloudflare the Worker serves the same files under the site's own
 * paths (cloudflare/src/index.ts), so the production build links to them there.
 *
 * Has to follow `mergeRedirects`, whose `_redirects` it rewrites. Nua derives its
 * Markdown copies of the pages from the HTML only afterwards, so they agree.
 */
export function ownOriginFiles(): AstroIntegration {
  let siteOrigin: string | undefined;

  return {
    name: 'ochrance:own-origin-files',
    hooks: {
      'astro:config:done': ({ config }) => {
        siteOrigin = config.site && new URL(config.site).origin;
      },
      'astro:build:done': async ({ dir, logger }) => {
        const origin = siteOrigin;
        if (!origin) throw new Error('`site` has to be set to link to files on the site.');
        const dist = fileURLToPath(dir);
        const rewrite = async (file: string, transform: (text: string) => string) => {
          const text = await readFile(file, 'utf-8');
          const rewritten = transform(text);
          if (rewritten !== text) await writeFile(file, rewritten, 'utf-8');
          return rewritten !== text;
        };

        await rewrite(join(dist, '_redirects'), rewriteRedirects);
        let changed = 0;
        // A redirect from a file URL makes Astro emit a directory named like a file.
        for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
          if (!entry.isFile() || !TEXT_OUTPUT.test(entry.name)) continue;
          if (await rewrite(join(entry.parentPath, entry.name), text => rewriteFileUrls(text, origin))) changed++;
        }
        logger.info(`Linked files on ${origin} in ${changed} outputs`);
      },
    },
  };
}
