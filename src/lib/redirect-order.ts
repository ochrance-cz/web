import { readFile, writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';

const isRule = (line: string) => Boolean(line) && !line.startsWith('#');
const isPattern = (line: string) => {
  const from = line.split(/\s+/)[0] ?? '';
  return from.includes('*') || from.includes('/:');
};

/**
 * Cloudflare applies the top-most rule matching a path and wants every exact rule
 * ahead of the patterns. nua merges `_redirects` source by source, so the
 * `redirects` from the config land after the patterns in `public/_redirects`
 * (`/letaky/:slug/:file`, `/uploads-import/*`), which would catch their paths first.
 * This moves the exact rules ahead and keeps the order within each group.
 *
 * Runs before the CMS merges the editors' `src/_redirects`, which it puts ahead of
 * everything else.
 */
export function exactRedirectsFirst(): AstroIntegration {
  return {
    name: 'ochrance:exact-redirects-first',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const target = new URL('_redirects', dir);
        const text = await readFile(target, 'utf-8').catch(() => '');
        const lines = text.split('\n').map(line => line.trim());
        const rules = lines.filter(isRule);
        const ordered = [...rules.filter(line => !isPattern(line)), ...rules.filter(isPattern)];
        if (ordered.every((line, i) => line === rules[i])) return;

        const comments = lines.filter(line => line.startsWith('#'));
        await writeFile(target, [...comments, ...ordered, ''].join('\n'), 'utf-8');
        logger.info(`Moved ${ordered.filter(isPattern).length} pattern rules after the exact ones`);
      },
    },
  };
}
