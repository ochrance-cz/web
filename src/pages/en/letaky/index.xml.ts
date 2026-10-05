import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { url } from '../../../lib/paths';
import { detailSlug } from '../../../components/letaky/helpers';

export async function GET(context: APIContext) {
  const entries = (await getCollection('letaky-en')).sort((a, b) =>
    a.data.title.localeCompare(b.data.title, 'en')
  );

  return rss({
    title: 'Leaflets | Ombudsman',
    description: "Public Defender's office prepares leaflets to help in difficult situations.",
    site: context.site ?? 'https://www.ochrance.cz/',
    items: entries.map((entry) => ({
      title: entry.data.title,
      link: url('en', 'letaky', detailSlug(entry)),
    })),
  });
}
