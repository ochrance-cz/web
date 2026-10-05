/** Move landing-page content from legacy Hugo `_index` files into Nua. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';
import { editorMarkdown } from './lib/editor-markdown';

const root = join(import.meta.dir, '..');
const pages = {
  'vzdelavaci-akce': 'content/vzdelavaci-akce/_index.markdown',
  vystupy: 'content/vystupy/_index.markdown',
  projekty: 'content/projekty/_index.markdown',
  'projekty-en': 'content-en/projekty/_index.markdown',
  'o-nas': 'content/o-nas/_index.markdown',
  'o-nas-en': 'content-en/o-nas/_index.markdown',
  pristupnost: 'content/pristupnost/_index.md',
  srozumitelne: 'content/srozumitelne/_index.markdown',
  eso: 'content/eso/_index.markdown',
  umluva: 'content/umluva/_index.markdown',
} as const;

for (const [id, sourceName] of Object.entries(pages)) {
  const source = matter(readFileSync(join(root, sourceName), 'utf8'));
  const data = { ...source.data, pagePath: id.endsWith('-en') ? `/en/${id.slice(0, -3)}/` : `/${id}/` };
  for (const field of ['description', 'hp', 'perex'] as const) {
    if (typeof data[field] === 'string') data[field] = editorMarkdown(data[field]);
  }
  if (Array.isArray(data.textcontent)) {
    data.textcontent = data.textcontent.map((item: Record<string, unknown>) => ({
      ...item,
      text: typeof item.text === 'string' ? editorMarkdown(item.text) : item.text,
    }));
  }
  if (Array.isArray(data.twocols)) {
    data.twocols = data.twocols.map((item: Record<string, unknown>) => Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        /^(?:left|right)-\d+$/.test(key) && typeof value === 'string' ? editorMarkdown(value) : value,
      ]),
    ));
  }
  const target = join(root, 'src/content/section-pages', id, 'index.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, matter.stringify('', {
    ...data,
    ...(source.content.trim() ? { body: editorMarkdown(source.content) } : {}),
  }));
}
