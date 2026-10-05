import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCmsCore, createNodeFs, parseConfigSource } from '@nuasite/cms-core';
import { createServer } from '@nuasite/cms-sidecar';
import { compareCzechCollections } from '../node_modules/@nuasite/collections-admin/src/collection-order';

const disk = createNodeFs(process.cwd());
// Check the literal schema, before the local vocabulary patch can conceal a
// Czech label in a shared English sub-schema.
const parsed = parseConfigSource(readFileSync('src/content.config.ts', 'utf8'));
for (const [name, definition] of parsed) {
  const english = name.endsWith('-en');
  assert.equal(definition.fields.find(f => f.name === 'title')?.layout?.label, english ? 'Title' : name === 'lide' ? 'Jméno' : 'Název', `${name}: consistent entry title`);
  assert.equal(definition.fields.find(f => f.name === 'date')?.type, 'date', `${name}: publication date available`);
  const walk = (fields: typeof definition.fields) => {
    for (const field of fields) {
      if (english) assert.doesNotMatch(field.layout?.label ?? '', /[áčďéěíňóřšťúůýž]/i, `${name}.${field.name}: literal label language`);
      if (field.name === 'perex') assert.equal(field.layout?.label, english ? 'Lead' : 'Perex');
      if (field.name === 'body') assert.equal(field.layout?.label, english ? 'Main text' : 'Hlavní text');
      if (field.fields) walk(field.fields);
    }
  };
  walk(definition.fields);
}

const realCore = createCmsCore(disk);
const definitions = await realCore.scanCollections();
const requestedFirst = ['aktualne', 'letaky', 'dokument', 'provoz-kontakty', 'zpravodaj', 'info106', 'alert'];
const czechNavigation = Object.values(definitions).filter(c => !c.name.endsWith('-en')).sort(compareCzechCollections);
assert.deepEqual(czechNavigation.slice(0, requestedFirst.length).map(c => c.name), requestedFirst, 'Frequent Czech collections precede alphabetic remainder');
assert(definitions.pusobnost.entries?.some(e => e.slug === 'obcane-eu'), 'EU citizens page is editable under Působnost');
assert(!definitions.info.entries?.some(e => e.slug === 'obcane-eu'), 'EU citizens page is absent from Info');
for (const [name, definition] of Object.entries(definitions)) {
  assert.equal(definition.fields.find(f => f.name === 'date')?.type, 'date', `${name}: publication date reaches the editor API, even when empty`);
}
// The scanner must retain fields declared in the schema even when no entry has
// ever stored one. Reproduce the missing-input bug without compatibility seeds.
const unseeded = await createCmsCore({
  ...disk,
  readFile: async path => {
    const source = await disk.readFile(path);
    return path.startsWith('src/content/') ? source.replace(/^date: null\n/m, '') : source;
  },
}).scanCollections();
for (const [name, definition] of Object.entries(unseeded)) {
  assert.equal(definition.fields.find(f => f.name === 'date')?.type, 'date', `${name}: declared date exists before first save`);
}
// Fix the scan snapshot only: the real sidecar sorting, projection and cursor
// code is exercised with adversarial dates without writing editorial files.
const samples = [
  { slug: 'unknown', title: 'Bez data', data: {} },
  { slug: 'blank', title: 'Prázdné datum', data: { date: '' } },
  { slug: 'invalid', title: 'Chybné datum', data: { date: 'not-a-date' } },
  { slug: 'new', title: 'Život', data: { date: new Date('2026-01-01T00:00:00Z') } },
  { slug: 'old', title: 'Člověk', data: { date: '2025-01-01' } },
  { slug: 'zone', title: 'Charta', data: { date: '2025-12-31T23:30:00-02:00' } },
  { slug: 'same-b', title: 'Stejný název', data: { date: '2025-06-01' } },
  { slug: 'same-a', title: 'Stejný název', data: { date: '2025-06-01' } },
].map(e => ({ ...e, sourcePath: `src/content/aktualne/${e.slug}.md` }));
const core = { ...realCore, scanCollections: async () => ({ ...definitions, aktualne: { ...definitions.aktualne, entries: samples } }) };
const server = createServer({ core, fs: disk, root: process.cwd(), coreVersion: 'collection-ux-verification' });
async function request(collection: string, query: string) {
  const response = await server.fetch(new Request(`http://localhost/cms/v1/collections/${collection}/entries?draft=all&${query}`));
  assert.equal(response.status, 200);
  return await response.json() as { entries: Array<{ slug: string; pathname?: string; previewPathname?: string }>; cursor?: string; hasMore: boolean };
}
async function allPages(sortField: string, sort: string) {
  const entries: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await request('aktualne', new URLSearchParams({ sortField, sort, limit: '2', ...(cursor ? { cursor } : {}) }).toString());
    entries.push(...page.entries.map(e => e.slug));
    cursor = page.cursor;
    assert.equal(page.hasMore, !!cursor);
  } while (cursor);
  assert.equal(new Set(entries).size, samples.length, 'pagination retains every unique entry');
  return entries;
}
assert.deepEqual(await allPages('date', 'desc'), ['zone', 'new', 'same-a', 'same-b', 'old', 'unknown', 'invalid', 'blank']);
assert.deepEqual(await allPages('date', 'asc'), ['old', 'same-a', 'same-b', 'new', 'zone', 'unknown', 'invalid', 'blank']);
for (const sort of ['asc', 'desc']) {
  const expected = [...samples].sort((a, b) => a.title.localeCompare(b.title, 'cs') * (sort === 'asc' ? 1 : -1) || a.slug.localeCompare(b.slug, 'cs')).map(e => e.slug);
  assert.deepEqual(await allPages('title', sort), expected, 'Czech alphabet and stable tie order across pages');
}
// Each collection has a usable preview target on its FIRST list request. There
// must be no need to populate another cache by refreshing the page first.
for (const name of Object.keys(definitions)) {
  for (const field of ['title', 'date']) {
    const page = await request(name, `sortField=${field}&sort=asc&limit=1`);
    assert.ok(page.entries[0]?.pathname || page.entries[0]?.previewPathname, `${name}: first response contains a preview target`);
  }
}
console.log(`Verified ${parsed.size} source schemas, first preview targets, publication dates, Czech collation and paginated mixed-date sorting.`);
