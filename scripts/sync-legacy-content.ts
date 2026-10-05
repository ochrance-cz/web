/** Import only new legacy records into the current collections. Existing records
 * are reported for review; never use the old bulk extractors over edited content.
 * bun scripts/sync-legacy-content.ts /path/to/ochrance-cz-web [--apply]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';
import YAML from 'yaml';
import { editorMarkdown } from './lib/editor-markdown';
const source = process.argv[2];
if (!source) throw new Error('Provide the legacy repository directory');
const apply = process.argv.includes('--apply');
const base = 'cfdfe9fc'; // June 26 import snapshot in the upstream history
const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const changed = git('diff', '--no-renames', '--name-status', base, 'HEAD', '--', 'content', 'content-en').trim().split('\n');
function write(file: string, content: string) {
  if (existsSync(file)) throw new Error(`Refusing to overwrite ${file}`);
  console.log(`${apply ? 'Import' : 'Would import'} ${file}`);
  if (apply) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); }
}
const rich = (body: string) => editorMarkdown(body)
  .replace(/\{\{<\s*youtube\s*"?([A-Za-z0-9_-]{11})"?\s*>\}\}/g, '::youtube{#$1}')
  .replace(/(?<!\\)\{\{[<%].*?[>%]\}\}/g, value => value.replace(/[{}<>]/g, '\\$&'));
const pick = (data: any, keys: string[]) => Object.fromEntries(keys.filter(k => data[k] !== undefined).map(k => [k, data[k]]));
for (const line of changed) {
  const [status, file] = line.split('\t');
  if (!/\.(md|markdown)$/.test(file)) continue;
  const match = file.match(/^(content(?:-en)?)\/(aktualne|dokument|letaky|zpravodaj)\/([^/]+)\/index.md$/);
  if (!match || status !== 'A') { console.log(`Review ${status} ${file}`); continue; }
  const [, root, section, slug] = match;
  const collection = section + (root === 'content-en' ? '-en' : '');
  const target = `src/content/${collection}/${slug}.${section === 'zpravodaj' ? 'yaml' : 'md'}`;
  if (existsSync(target)) { console.log(`Already present: ${target}`); continue; }
  const parsed = matter(readFileSync(join(source, file), 'utf8'));
  const d = parsed.data;
  const assetBase = `/${root === 'content-en' ? 'en/' : ''}${section}/${slug}/`;
  const asset = (value: string) => /^(?:[a-z]+:|\/|#)/i.test(value) ? value : assetBase + value;
  let body = parsed.content.replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (_, a, u, b) => a + asset(u) + b);
  let data: any;
  if (section === 'aktualne') {
    data = pick(d, ['title', 'date', 'draft']);
    if (d.perex) data.perex = editorMarkdown(d.perex);
    if (d.vystupy) data[root === 'content-en' ? 'categories' : 'kategorie'] = d.vystupy;
    if (d.illustration) data[root === 'content-en' ? 'illustration' : 'obrazek'] = asset(d.illustration);
  } else if (section === 'dokument') {
    data = pick(d, ['title', 'date', 'draft', 'vystupy', 'organ']);
    if (d.perex) data.perex = editorMarkdown(d.perex);
    if (d.file) data.file = asset(d.file);
  } else if (section === 'letaky') {
    data = pick(d, ['title', 'date', 'draft', 'situace']);
    for (const key of ['file', 'seeing', 'roma', 'kids']) if (d[key]) data[key] = asset(d[key]);
  } else {
    data = pick(d, ['title', 'month', 'year', 'author', 'file']);
    let order = 0;
    for (const s of d.sections ?? []) for (const a of s.articles ?? []) {
      order++;
      write(`src/content/zpravodaj-articles/${slug}--${String(order).padStart(4, '0')}.md`, matter.stringify(rich(a.body ?? ''), { parent: slug, order, section: s.title, ...pick(a, ['title', 'id', 'eso']) }));
    }
    write(target, YAML.stringify(data));
    continue;
  }
  body = rich(body);
  for (const key of ['attachmentsTop', 'attachments']) {
    const links = (d[key] ?? []).map((a: any) => `- [${a.title ?? a.text ?? ''}](<${asset(a.file || a.link)}>)`);
    if (links.length) body += '\n\n' + links.join('\n');
  }
  write(target, matter.stringify(body.trim() + '\n', data));
}
