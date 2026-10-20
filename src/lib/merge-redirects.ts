import { readFile, writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';
import { leafletFileRedirects } from './leaflet-file';

const sourceOf = (line: string) => line.split(/\s+/)[0] ?? '';
const isRule = (line: string) => Boolean(line) && !line.startsWith('#');
const rules = (text: string) => text.split('\n').map(l => l.trim()).filter(isRule);

/**
 * `@nuasite/nua` writes `dist/_redirects` from the `redirects` config on
 * `astro:build:done`, which clobbers the copy Astro takes from `public/`.
 * nua's integration is registered first, so this one runs after it and merges
 * the two, together with the redirects editors add in the CMS (`src/_redirects`)
 * and the stable addresses of leaflet files (src/lib/leaflet-file.ts).
 * An editor's rule wins over ours: it is the newer intent for that path. A
 * leaflet's address wins over `public/_redirects`, which still points some of
 * them at the file the leaflet had before the CMS.
 *
 * Order is load-bearing: Cloudflare Pages applies the top-most rule matching a
 * source path, so every exact-path rule has to precede the wildcards.
 */
export function mergeRedirects(): AstroIntegration {
	const isDynamic = (line: string) => {
		const from = sourceOf(line);
		return from.includes('*') || from.includes('/:');
	};

	return {
		name: 'ochrance:merge-redirects',
		hooks: {
			// nua injects `@nuasite/cms` from its own setup hook, so an integration
			// injected here lands after it.
			'astro:config:setup': ({ updateConfig }) => {
				updateConfig({ integrations: [dropDuplicateRedirects()] });
			},
			'astro:build:done': async ({ dir, logger }) => {
				const target = new URL('_redirects', dir);
				const generated = rules(await readFile(target, 'utf-8').catch(() => ''));
				const ours = rules(await readFile('public/_redirects', 'utf-8').catch(() => ''));
				const cms = rules(await readFile('src/_redirects', 'utf-8').catch(() => ''));
				const leaflets = await leafletFileRedirects();
				if (!ours.length && !cms.length && !leaflets.length) return;

				const seen = new Set<string>();
				const take = (lines: string[]) =>
					lines.filter(l => {
						const from = sourceOf(l);
						if (seen.has(from)) return false;
						seen.add(from);
						return true;
					});

				const merged = [
					'# Merged by src/lib/merge-redirects.ts: src/_redirects (CMS) + leaflet files + public/_redirects + the rules',
					'# nua generates from `redirects` in astro.config.ts. Exact paths first, wildcards last.',
					...take(cms.filter(l => !isDynamic(l))),
					...take(leaflets),
					...take(ours.filter(l => !isDynamic(l))),
					...take(generated),
					...take(cms.filter(isDynamic)),
					...take(ours.filter(isDynamic)),
					'',
				].join('\n');

				await writeFile(target, merged, 'utf-8');
				logger.info(`Merged _redirects: ${seen.size} rules (${generated.length} from nua, ${cms.length} from the CMS, ${leaflets.length} leaflet files)`);
			},
		},
	};
}

/**
 * `@nuasite/cms` appends `src/_redirects` to `dist/_redirects` as it is, after
 * the merge above has already placed those rules. Cloudflare rejects the whole
 * deploy over a source path listed twice, so this drops every repeat.
 */
function dropDuplicateRedirects(): AstroIntegration {
	return {
		name: 'ochrance:drop-duplicate-redirects',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const target = new URL('_redirects', dir);
				const text = await readFile(target, 'utf-8').catch(() => '');
				if (!text) return;

				const seen = new Set<string>();
				let dropped = 0;
				const lines = text.split('\n').filter(line => {
					const trimmed = line.trim();
					if (!isRule(trimmed)) return true;
					const from = sourceOf(trimmed);
					if (seen.has(from)) {
						dropped++;
						return false;
					}
					seen.add(from);
					return true;
				});
				// Comments left with no rules after them, such as the CMS's own header.
				while (lines.length && !isRule(lines.at(-1)!.trim())) lines.pop();
				if (!dropped) return;

				await writeFile(target, lines.join('\n') + '\n', 'utf-8');
				logger.info(`Dropped ${dropped} repeated rules from _redirects`);
			},
		},
	};
}
