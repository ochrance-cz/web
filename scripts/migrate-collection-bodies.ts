/**
 * Move a YAML `body` field into a Markdown entry body so Nua's hosted collection
 * editor uses its full WYSIWYG instead of a frontmatter text input.
 *
 * Usage: bun scripts/migrate-collection-bodies.ts [--apply] eso aktualne ...
 * Without --apply this only checks the conversion and reports the file count.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const allowed = new Set([
  'eso', 'aktualne', 'aktualne-en', 'dokument', 'dokument-en',
  'pusobnost', 'pusobnost-en', 'provoz', 'provoz-en', 'projekty', 'projekty-en',
  'pristupnost', 'pristupnost-en', 'potrebuji-pomoc', 'potrebuji-pomoc-en',
  'o-nas', 'o-nas-en', 'pro-media', 'podejte-stiznost', 'podejte-stiznost-en',
  'letaky', 'letaky-en', 'vzdelavaci-akce', 'zpravodaj-articles',
  'o-nas-timeline', 'info', 'info-en', 'info106',
  'srozumitelne', 'nas-pribeh', 'umluva',
  'kontakt', 'kontakt-en', 'kontrola', 'kontrola-en',
  'newsletter', 'manual', 'style', 'vyzkumy-vse', 'zpravodaj-vse',
]);
const apply = process.argv.includes('--apply');
const names = process.argv.slice(2).filter(arg => arg !== '--apply');
assert.ok(names.length > 0, 'Select at least one collection');
for (const name of names) assert.ok(allowed.has(name), `Collection is not in the approved migration set: ${name}`);

let count = 0;
let bodies = 0;
for (const name of names) {
  const dir = join(process.cwd(), 'src/content', name);
  for (const file of readdirSync(dir).filter(file => /\.ya?ml$/.test(file))) {
    const source = join(dir, file);
    const target = source.replace(/\.ya?ml$/, '.md');
    assert.ok(!existsSync(target), `Refusing to overwrite ${target}`);
    const document = YAML.parseDocument(readFileSync(source, 'utf8'));
    assert.equal(document.errors.length, 0, `${source}: invalid YAML`);
    const original = document.toJS() as Record<string, unknown>;
    assert.ok(original && typeof original === 'object' && !Array.isArray(original), `${source}: expected an object`);
    assert.ok(original.body == null || typeof original.body === 'string', `${source}: body must be text`);
    const body = typeof original.body === 'string' ? original.body : '';
    document.delete('body');
    const frontmatter = document.toString({ lineWidth: 0 }).trimEnd();
    const markdown = `---\n${frontmatter}\n---\n${body}`;
    const converted = YAML.parse(frontmatter) as Record<string, unknown>;
    const expected = { ...original };
    delete expected.body;
    assert.deepEqual(converted, expected, `${source}: frontmatter changed`);
    assert.equal(markdown.slice(markdown.indexOf('\n---\n', 4) + 5), body, `${source}: body changed`);
    if (apply) {
      writeFileSync(target, markdown);
      unlinkSync(source);
    }
    count++;
    if (body.trim()) bodies++;
  }
}
console.log(`${apply ? 'Migrated' : 'Validated'} ${count} entries (${bodies} with body text) in ${names.join(', ')}.`);
