/** Move legacy nested CMS entries to flat collections with an editable parent reference. */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src/content');
const groups = [
  { parent: 'zpravodaj', nested: 'articles', child: 'zpravodaj-articles' },
  { parent: 'o-nas', nested: 'timeline', child: 'o-nas-timeline' },
  { parent: 'pristupnost', nested: 'gallery', child: 'pristupnost-gallery' },
];

for (const group of groups) {
  const source = join(root, group.parent);
  const destination = join(root, group.child);
  mkdirSync(destination, { recursive: true });
  let moved = 0;
  for (const parentSlug of readdirSync(source)) {
    const nestedDir = join(source, parentSlug, group.nested);
    if (!existsSync(nestedDir)) continue;
    for (const file of readdirSync(nestedDir)) {
      if (!/\.ya?ml$/.test(file)) continue;
      const oldPath = join(nestedDir, file);
      const target = join(destination, `${parentSlug}--${file}`);
      if (existsSync(target)) throw new Error(`Refusing to overwrite ${target}`);
      const raw = readFileSync(oldPath, 'utf8');
      writeFileSync(target, `parent: ${JSON.stringify(parentSlug)}\n${raw}`);
      rmSync(oldPath);
      moved++;
    }
    if (readdirSync(nestedDir).length === 0) rmSync(nestedDir, { recursive: true });
  }
  console.log(`${group.child}: moved ${moved} entries`);
}
