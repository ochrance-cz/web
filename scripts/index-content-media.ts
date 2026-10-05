import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const roots = ['src/content', 'src/components', 'src/page-copy'].map(dir => join(process.cwd(), dir));
const output = join(process.cwd(), 'src/lib/content-media.json');
const cdn = /^https:\/\/cdn\.nuasite\.com\/assets\/ochrance-web-lj8h86\//;
const urls = new Set<string>();

function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:ya?ml|md|astro)$/.test(entry.name)) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/https:\/\/cdn\.nuasite\.com\/assets\/ochrance-web-lj8h86\/[^\s<>"'\])}]+/g)) {
        const value = match[0].replace(/[.,;]+$/, '').replace(/\\([_()[\]])/g, '$1');
        if (cdn.test(value)) urls.add(value);
      }
    }
  }
}

function contentType(url: string): string | null {
  const ext = extname(new URL(url).pathname).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.odt': 'application/vnd.oasis.opendocument.text', '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
  };
  return types[ext] ?? null;
}

roots.forEach(walk);
const items = [...urls].map(url => {
  const mime = contentType(url);
  if (!mime) return null;
  const filename = decodeURIComponent(new URL(url).pathname.split('/').at(-1) ?? '');
  return { id: `content:${url}`, url, filename, contentType: mime };
}).filter(item => item !== null).sort((a, b) => a.filename.localeCompare(b.filename) || a.url.localeCompare(b.url));
const serialized = `${JSON.stringify(items)}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== serialized) throw new Error('Content media index is out of date. Run bun run media:index.');
} else {
  writeFileSync(output, serialized);
}
console.log(`Indexed ${items.length} referenced CDN assets (${items.filter(item => item.contentType.startsWith('image/')).length} images).`);
