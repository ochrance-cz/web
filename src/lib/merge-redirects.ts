import { readFile, writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';

/**
 * `@nuasite/nua` writes `dist/_redirects` from the `redirects` config on
 * `astro:build:done`, which clobbers the copy Astro takes from `public/`.
 * nua's integration is registered first, so this one runs after it and merges
 * the two.
 *
 * Order is load-bearing: Cloudflare Pages applies the top-most rule matching a
 * source path, so every exact-path rule has to precede the wildcards.
 */
export function mergeRedirects(): AstroIntegration {
	const isDynamic = (line: string) => {
		const from = line.split(/\s+/)[0] ?? '';
		return from.includes('*') || from.includes('/:');
	};
	const rules = (text: string) =>
		text
			.split('\n')
			.map(l => l.trim())
			.filter(l => l && !l.startsWith('#'));

	return {
		name: 'ochrance:merge-redirects',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const target = new URL('_redirects', dir);
				const generated = rules(await readFile(target, 'utf-8').catch(() => ''));
				const ours = rules(await readFile('public/_redirects', 'utf-8').catch(() => ''));
				if (!ours.length) return;

				const seen = new Set<string>();
				const take = (lines: string[]) =>
					lines.filter(l => {
						const from = l.split(/\s+/)[0];
						if (seen.has(from)) return false;
						seen.add(from);
						return true;
					});

				const merged = [
					'# Merged by src/lib/merge-redirects.ts: public/_redirects + the rules nua',
					'# generates from `redirects` in astro.config.ts. Exact paths first, wildcards last.',
					...take(ours.filter(l => !isDynamic(l))),
					...take(generated),
					...take(ours.filter(isDynamic)),
					'',
				].join('\n');

				await writeFile(target, merged, 'utf-8');
				logger.info(`Merged _redirects: ${seen.size} rules (${generated.length} from nua)`);
			},
		},
	};
}
