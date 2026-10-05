import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

// One-time migration: keep existing article downloads editable in the main body.
for (const [directory, field] of [
  ['src/content/aktualne', 'prilohy'],
  ['src/content/aktualne-en', 'attachments'],
] as const) {
  for (const filename of readdirSync(directory).filter(name => name.endsWith('.md'))) {
    const path = join(directory, filename);
    const source = readFileSync(path, 'utf8');
    const parsed = matter(source);
    if (!Object.hasOwn(parsed.data, field)) continue;
    const attachments = parsed.data[field] as Array<{ title: string; file?: string; link?: string }>;
    if (!Array.isArray(attachments)) throw new Error(`Unexpected ${field}: ${path}`);

    const lines = source.split('\n');
    const closing = lines.findIndex((line, index) => index > 0 && line === '---');
    const start = lines.findIndex((line, index) => index > 0 && index < closing && (line === `${field}:` || line === `${field}: []`));
    if (closing < 0 || start < 0) throw new Error(`Cannot locate ${field}: ${path}`);
    let end = start + 1;
    while (end < closing && (lines[end].startsWith(' ') || lines[end] === '')) end++;
    lines.splice(start, end - start);

    if (attachments.length) {
      const links = attachments.map(item => {
        const raw = item.file || item.link;
        if (!raw || !item.title) throw new Error(`Incomplete ${field}: ${path}`);
        // One imported URL contains two URLs separated by a space; the last is the PDF.
        const url = raw.trim().split(/\s+(?=https?:\/\/)/).at(-1)!;
        return `- [${item.title.replace(/([\\\[\]])/g, '\\$1')}](<${url.replace(/>/g, '%3E')}>)`;
      });
      const heading = field === 'prilohy' ? 'Související odkazy' : 'Related links';
      while (lines.at(-1) === '') lines.pop();
      lines.push('', `**${heading}**`, '', ...links, '');
    }
    writeFileSync(path, lines.join('\n'));
  }
}
