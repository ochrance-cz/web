// RSS feed for the educational events section: /vzdelavaci-akce/index.xml
// Built manually (no @astrojs/rss dependency) to mirror Hugo's per-section RSS.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const TITLE = 'Vzdělávací akce';
const DESCRIPTION = 'Vzdělávací akce veřejného ochránce práv';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async (context) => {
  const site = context.site?.href ?? 'https://www.ochrance.cz/';
  const sectionUrl = new URL('vzdelavaci-akce/', site).href;

  const entries = await getCollection('vzdelavaci-akce');
  const items = entries
    .filter((e) => e.data.startDate)
    .sort(
      (a, b) =>
        new Date(b.data.startDate!).getTime() - new Date(a.data.startDate!).getTime()
    )
    .slice(0, 50);

  const itemsXml = items
    .map((entry) => {
      const link = new URL(`vzdelavaci-akce/${entry.id}/`, site).href;
      const pubDate = new Date(entry.data.startDate!).toUTCString();
      const desc = entry.data.perex ? `<description>${escapeXml(entry.data.perex)}</description>` : '';
      return `    <item>
      <title>${escapeXml(entry.data.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
${desc ? '      ' + desc + '\n' : ''}    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(TITLE)}</title>
    <link>${sectionUrl}</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>cs</language>
    <atom:link href="${sectionUrl}index.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
