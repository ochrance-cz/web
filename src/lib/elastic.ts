import { getPageEntries } from './page-content';
import { getCollection } from 'astro:content';
import { getNews } from './news';

type Locale = 'cs' | 'en';

// collection key -> { url path prefix, section name } per locale.
// Mirrors the route structure built by the per-collection pages.
const CS: Array<[string, string, string]> = [
  ['aktualne', 'aktualne', 'aktualne'],
  ['dokument', 'dokument', 'dokument'],
  ['letaky', 'letaky', 'letaky'],
  ['vzdelavaci-akce', 'vzdelavaci-akce', 'vzdelavaci-akce'],
  ['zpravodaj', 'zpravodaj', 'zpravodaj'],
  ['eso', 'eso', 'eso'],
  ['o-nas', 'o-nas', 'o-nas'],
  ['pusobnost', 'pusobnost', 'pusobnost'],
  ['potrebuji-pomoc', 'potrebuji-pomoc', 'potrebuji-pomoc'],
  ['projekty', 'projekty', 'projekty'],
  ['pristupnost', 'pristupnost', 'pristupnost'],
  ['info', 'info', 'info'],
  ['info106', 'info106', 'info106'],
  ['provoz', 'provoz', 'provoz'],
  ['srozumitelne', 'srozumitelne', 'srozumitelne'],
  ['nas-pribeh', 'nas-pribeh', 'nas-pribeh'],
  ['umluva', 'umluva', 'umluva'],
];
const EN: Array<[string, string, string]> = [
  ['aktualne-en', 'en/aktualne', 'aktualne'],
  ['dokument-en', 'en/dokument', 'dokument'],
  ['letaky-en', 'en/letaky', 'letaky'],
  ['o-nas-en', 'en/o-nas', 'o-nas'],
  ['pusobnost-en', 'en/pusobnost', 'pusobnost'],
  ['potrebuji-pomoc-en', 'en/potrebuji-pomoc', 'potrebuji-pomoc'],
  ['projekty-en', 'en/projekty', 'projekty'],
  ['info-en', 'en/info', 'info'],
  ['provoz-en', 'en/provoz', 'provoz'],
];

const SITE = 'https://www.ochrance.cz';

function stripHtml(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Build an Elasticsearch _bulk ndjson feed for a locale (mirrors Hugo's Elastic output). */
export async function buildElasticBulk(locale: Locale): Promise<string> {
  const table = locale === 'en' ? EN : CS;
  const index = `ochrance-${locale}`;
  const lines: string[] = [];
  for (const [key, prefix, section] of table) {
    let entries: any[] = [];
    try {
      entries = key === 'aktualne' || key === 'aktualne-en'
        ? await getNews(key)
        : ['o-nas', 'o-nas-en', 'potrebuji-pomoc', 'potrebuji-pomoc-en', 'nas-pribeh'].includes(key)
          ? await getPageEntries(key)
          : await getCollection(key as any);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.data?.draft) continue;
      const rel = `/${prefix}/${e.id}/`;
      const permalink = `${SITE}${rel}`;
      const id = e.id;
      const perex = stripHtml(e.data?.perex);
      lines.push(JSON.stringify({ index: { _index: index, _type: 'doc', _id: id } }));
      lines.push(JSON.stringify({
        objectID: id,
        title: e.data?.title ?? '',
        perex,
        summary: perex,
        date: e.data?.date ?? e.data?.startDate ?? null,
        permalink,
        relpermalink: rel,
        url: permalink,
        lang: locale,
        kind: 'page',
        section,
        type: section,
        tags: e.data?.vystupy ?? e.data?.situace ?? [],
        content: perex,
      }));
    }
  }
  return lines.join('\n') + '\n';
}
