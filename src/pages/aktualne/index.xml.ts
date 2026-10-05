import rss from '@astrojs/rss';
import { getNews } from '../../lib/news';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = (await getNews('aktualne', (e) => e.data.draft !== true))
    .sort((a, b) => new Date(b.data.date ?? 0).getTime() - new Date(a.data.date ?? 0).getTime())
    .slice(0, 50);
  return rss({
    title: 'Veřejný ochránce práv — Aktuálně',
    description: 'Aktuality veřejného ochránce práv',
    site: context.site!,
    items: entries.map((entry) => ({
      title: entry.data.title,
      link: `/aktualne/${entry.id}/`,
      pubDate: entry.data.date ? new Date(entry.data.date) : undefined,
      description: entry.data.perex,
    })),
  });
}
