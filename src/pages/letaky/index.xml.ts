import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { url } from '../../lib/paths';
import { detailSlug } from '../../components/letaky/helpers';

export async function GET(context: APIContext) {
  const entries = (await getCollection('letaky'))
    .filter((e) => !e.data.draft)
    .sort((a, b) => a.data.title.localeCompare(b.data.title, 'cs'));

  return rss({
    title: 'Letáky | Ombudsman',
    description: 'Ombudsman pro vás připravil pomocné návody na řešení vašich životních situací.',
    site: context.site ?? 'https://www.ochrance.cz/',
    items: entries.map((entry) => ({
      title: entry.data.title,
      link: url('cs', 'letaky', detailSlug(entry)),
    })),
  });
}
