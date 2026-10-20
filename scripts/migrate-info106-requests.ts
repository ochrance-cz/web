/**
 * One-off: move the yearly info106 pages from a Markdown body (a heading per request,
 * links to its documents under it) into the structured `zadosti` field, so editors add
 * a request and its files in the CMS instead of writing links by hand.
 *
 *   bun scripts/migrate-info106-requests.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { stringify } from 'yaml';

type Doc = { nazev: string; soubor?: string };
type Request = { oznaceni?: string; dokumenty: Doc[] };

const dir = join(process.cwd(), 'src/content/info106');
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const clean = (text: string) => text.replace(/\*\*/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().replace(/[.:]$/, '').trim();

for (const name of readdirSync(dir).filter((file) => file.endsWith('.md')).sort()) {
  const path = join(dir, name);
  const { data, content } = matter(readFileSync(path, 'utf8'));
  const requests: Request[] = [];
  let current: Request | undefined;
  let linkCount = 0;

  for (const line of content.split('\n')) {
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      // `#### Přílohy:` only labels the attachments of the request above it.
      if (heading[1] === '####') continue;
      current = { oznaceni: clean(heading[2]), dokumenty: [] };
      requests.push(current);
      continue;
    }
    const text = line.replace(/^\s*-\s+/, '');
    if (!clean(text)) continue;
    if (!current) {
      // Years before 2011 list documents without request headings.
      current = { dokumenty: [] };
      requests.push(current);
    }
    const links = [...text.matchAll(LINK)];
    linkCount += links.length;
    // Text outside links: a document published without a file, or a group label.
    const rest = clean(text.replace(LINK, ' '));
    if (rest && links.length === 0) current.dokumenty.push({ nazev: rest });
    else if (rest) for (const part of rest.split(/\.\s*/).map(clean).filter(Boolean)) current.dokumenty.push({ nazev: part });
    for (const [, label, url] of links) current.dokumenty.push({ nazev: clean(label) || 'Dokument', soubor: url });
  }

  const migrated = requests.flatMap((request) => request.dokumenty.filter((doc) => doc.soubor)).length;
  if (migrated !== linkCount) throw new Error(`${name}: ${linkCount} links in the body, ${migrated} migrated`);
  const frontmatter = stringify({ ...data, title: String(data.title), zadosti: requests }, { lineWidth: 0 });
  writeFileSync(path, `---\n${frontmatter}---\n`);
  console.log(`${name}: ${requests.length} requests, ${migrated} files`);
}
