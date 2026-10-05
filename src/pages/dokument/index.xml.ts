import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

const dtime = (d: Date | string | undefined) => (d ? new Date(d).getTime() || 0 : 0);
const toDate = (d: Date | string | undefined) => (d ? new Date(d) : undefined);

export async function GET(context: APIContext) {
  const items = (await getCollection('dokument', (e) => !e.data.draft))
    .sort((a, b) => dtime(b.data.date) - dtime(a.data.date))
    .slice(0, 50);

  return rss({
    title: 'Dokumenty | Ombudsman',
    description: 'Dokumenty a publikace veřejného ochránce práv',
    site: context.site ?? 'https://www.ochrance.cz/',
    items: items.map((entry) => ({
      title: entry.data.title,
      pubDate: toDate(entry.data.date),
      description: entry.data.perex ?? '',
      link: `/dokument/${entry.id}/`,
    })),
  });
}
