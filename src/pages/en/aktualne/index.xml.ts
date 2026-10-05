import rss from '@astrojs/rss';
import { getNews } from '../../../lib/news';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = (await getNews('aktualne-en'))
    .sort((a, b) => new Date(b.data.date ?? 0).getTime() - new Date(a.data.date ?? 0).getTime())
    .slice(0, 50);
  return rss({
    title: 'The Public Defender of Rights — News',
    description: 'News from the Public Defender of Rights',
    site: context.site!,
    items: entries.map((entry) => ({
      title: entry.data.title,
      link: `/en/aktualne/${entry.id}/`,
      pubDate: entry.data.date ? new Date(entry.data.date) : undefined,
      description: entry.data.perex,
    })),
  });
}
