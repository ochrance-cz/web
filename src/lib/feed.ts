import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

type Locale = 'cs' | 'en';

/** Site-wide RSS feed (latest news) — mirrors Hugo's default /index.xml. */
export async function buildHomeFeed(locale: Locale, site: string | URL | undefined) {
  const key = locale === 'en' ? 'aktualne-en' : 'aktualne';
  const prefix = locale === 'en' ? '/en/aktualne/' : '/aktualne/';
  const items = (await getCollection(key as any))
    .filter((e: any) => !e.data.draft)
    .sort((a: any, b: any) => new Date(b.data.date ?? 0).getTime() - new Date(a.data.date ?? 0).getTime())
    .slice(0, 50)
    .map((e: any) => ({
      title: e.data.title,
      link: `${prefix}${e.id}/`,
      pubDate: e.data.date ? new Date(e.data.date) : undefined,
      description: (e.data.perex ?? '').replace(/<[^>]*>/g, '').trim(),
    }));
  return rss({
    title: locale === 'en' ? 'Public Defender of Rights' : 'Veřejný ochránce práv',
    description: locale === 'en' ? 'News from the Public Defender of Rights' : 'Aktuality veřejného ochránce práv',
    site: site ?? 'https://www.ochrance.cz',
    items,
  });
}
