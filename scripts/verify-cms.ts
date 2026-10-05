import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCmsCore, createNodeFs, checkContent, globToRegExp } from '@nuasite/cms-core';
import { createServer } from '@nuasite/cms-sidecar';
import { renderMarkdown } from '../src/lib/markdown';
import { collectionLabels } from '../src/lib/collection-labels';

// Exercise Nua's own scanner and save path. Writes stay in memory so this audit
// cannot change editorial files or publish anything.
const disk = createNodeFs(process.cwd());
const writes = new Map<string, string>();
const removed = new Set<string>();
const core = createCmsCore({
  ...disk,
  readFile: async path => {
    if (removed.has(path)) throw new Error(`Removed in test: ${path}`);
    return writes.get(path) ?? disk.readFile(path);
  },
  writeFile: async (path, value) => { removed.delete(path); writes.set(path, value); },
  remove: async path => { writes.delete(path); removed.add(path); },
  exists: async path => !removed.has(path) && (writes.has(path) || disk.exists(path)),
  list: async dir => {
    const entries = new Map((await disk.list(dir)).map(entry => [entry.name, entry]));
    for (const path of writes.keys()) {
      if (!path.startsWith(`${dir}/`)) continue;
      const remainder = path.slice(dir.length + 1);
      const name = remainder.split('/')[0];
      entries.set(name, { name, isDirectory: remainder.includes('/') });
    }
    for (const path of removed) {
      if (path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/')) {
        entries.delete(path.slice(dir.length + 1));
      }
    }
    return [...entries.values()];
  },
  glob: async pattern => {
    const matches = globToRegExp(pattern);
    return [...new Set([...(await disk.glob(pattern)), ...writes.keys()])]
      .filter(path => !removed.has(path) && matches.test(path));
  },
});
const report = await checkContent(disk);
assert.deepEqual(report.findings, [], 'Nua content validation');
const collections = await core.scanCollections();
assert.deepEqual(collections.dokument.fields.find(field => field.name === 'organ')?.options, ['CEDAW', 'OHCHR'], 'international statement organ is an editor picker');
assert.ok(collections.pusobnost.entries?.some(entry => entry.slug === 'ochrana-prosazovani-zakladnich-prav-nhri'), 'published NHRI page is editable');
assert.ok(collections.vystupy.entries?.some(entry => entry.slug === 'vyjadreni-pro-mezinarodni-organy'), 'international statements category is editable');
assert.ok(collections.dokument.entries?.some(entry => entry.slug === 'vybor_osn_pro_odstraneni_diskriminace_zen'), 'first international statement is editable');
const richBodyCollections = new Set([
  'aktualne', 'aktualne-en', 'dokument', 'dokument-en', 'eso',
  'pusobnost', 'pusobnost-en', 'provoz', 'provoz-en', 'projekty', 'projekty-en',
  'pristupnost', 'pristupnost-en',
  'o-nas', 'o-nas-en', 'pro-media', 'podejte-stiznost', 'podejte-stiznost-en',
  'letaky', 'letaky-en', 'vzdelavaci-akce', 'zpravodaj-articles',
  'info', 'info-en', 'info106',
  'srozumitelne', 'nas-pribeh', 'umluva',
  'kontakt', 'kontakt-en', 'kontrola', 'kontrola-en',
  'newsletter', 'manual', 'style', 'vyzkumy-vse', 'zpravodaj-vse',
  'section-pages', 'section-pages-en',
]);
const fixedPages = new Set([
  'section-pages', 'section-pages-en', 'homepage', 'homepage-en', 'site-settings', 'podejte-stiznost', 'podejte-stiznost-en',
  'alert', 'alert-en', 'kontakt', 'kontakt-en', 'kontrola', 'kontrola-en',
  'newsletter', 'manual', 'hledat', 'hledat-en', 'pro-media',
  'provoz-kontakty', 'zpravodaj-vse',
  'vyzkumy-vse', 'style',
]);
let saved = 0;
let created = 0;
let deleted = 0;
let minimalCreated = 0;
for (const [name, definition] of Object.entries(collections)) {
  assert.ok(!definition.fields.some(field =>
    !field.hidden && ['slug', 'media', 'oldUrl', 'routeSlug', 'pagePath', 'skrytePrilohy'].includes(field.name)
  ), `${name}: obsolete/technical fields are not editor controls`);
  const hiddenFields = definition.fields.filter(field => field.hidden).map(field => field.name);
  assert.deepEqual(hiddenFields, [], `${name}: obsolete fields do not remain in the editor`);
  const richBody = richBodyCollections.has(name);
  assert.equal(definition.type, richBody ? undefined : 'data', `${name}: expected ${richBody ? 'rich Markdown body' : 'data form'}`);
  assert.ok(collectionLabels[name]?.label, `${name}: collection needs a human-facing label`);
  const checkLabels = (fields: typeof definition.fields) => {
    for (const field of fields) {
      if (!field.hidden) assert.ok(field.label, `${name}.${field.name}: field needs a translated label`);
      if (name.endsWith('-en')) assert.ok(!/[áčďéěíňóřšťúůýž]/i.test(field.label ?? ''), `${name}.${field.name}: English field has a Czech label`);
      if (field.name === 'perex' && name !== 'alert' && name !== 'alert-en') assert.equal(field.type, 'textarea', `${name}: lead text has a supported metadata input`);
      if (field.fields) checkLabels(field.fields);
    }
  };
  checkLabels(definition.fields);
  assert.ok(definition.fragment ? definition.previewOf : definition.pathname, `${name}: collection needs a declared preview target`);
  const body = definition.fields.find(field => field.name === 'body');
  if (body) assert.equal(body.type, 'textarea', `${name}.body must have an editable multiline form control`);
  if (richBody) assert.equal(body, undefined, `${name}: body must be the visual editor, not a frontmatter field`);
  const path = definition.entries?.[0]?.sourcePath;
  assert.ok(path, `${name}: representative entry exists`);
  const slug = definition.entries?.[0]?.slug ?? path.slice(definition.path.length + 1).replace(/\.yaml$/, '');
  const entry = await core.getEntry(name, slug);
  assert.ok(entry, `${name}/${slug}: readable`);
  if (!richBody) assert.equal(entry.content, '', `${name}/${slug}: no separate page body`);
  const updated = structuredClone(entry.frontmatter);
  const updatedBody = richBody ? `${entry.content ? `${entry.content}\n\n` : ''}**CMS verification**` : undefined;
  if (body) updated.body = `${updated.body ?? ''}\n\n**CMS verification**`;
  else if (typeof updated.title === 'string') updated.title += ' — CMS verification';
  if (name === 'provoz-kontakty') {
    (updated.sections as { intro?: string }[])[0].intro = '**Updated contact introduction**';
  }
  const result = await core.updateEntry({ collection: name, slug, frontmatter: updated, body: updatedBody });
  assert.equal(result.success, true, `${name}/${slug}: save succeeds`);
  assert.deepEqual((await core.getEntry(name, slug))?.frontmatter, updated, `${name}/${slug}: edited values survive save without losing other fields`);
  if (richBody) assert.equal((await core.getEntry(name, slug))?.content, updatedBody, `${name}/${slug}: visual body survives save`);
  if (name === 'vzdelavaci-akce') {
    const dated = { ...updated, date: '2026-09-24' };
    assert.equal((await core.updateEntry({ collection: name, slug, frontmatter: dated, body: updatedBody })).success, true);
    assert.equal((await core.getEntry(name, slug))?.frontmatter.date, dated.date, 'publication date saves');
    assert.equal((await core.updateEntry({ collection: name, slug, frontmatter: { ...dated, date: null }, body: updatedBody })).success, true);
    assert.equal((await core.getEntry(name, slug))?.frontmatter.date, null, 'explicit date clear survives save');
    assert.equal((await core.getEntry(name, slug))?.frontmatter.startDate, updated.startDate, 'publication date does not overwrite event start');
    await core.updateEntry({ collection: name, slug, frontmatter: updated, body: updatedBody });
  }
  saved++;

  // Fixed page/settings records have no useful new-entry flow. Test deletion of
  // an existing record, then restore it in memory.
  if (fixedPages.has(name)) {
    const deletion = await core.deleteEntry(name, slug);
    assert.equal(deletion.success, true, `${name}: delete succeeds`);
    assert.equal(await core.getEntry(name, slug), null, `${name}: deleted record is absent`);
    assert.ok(!(await core.scanCollections())[name]?.entries?.some(e => e.slug === slug), `${name}: deleted record leaves collection`);
    deleted++;
    writes.set(path, await disk.readFile(path));
    removed.delete(path);
    continue;
  }

  const newSlug = `cms-verification-${name}`;
  const newData = structuredClone(entry.frontmatter);
  // A newly created record gets its own URL, rather than cloning an old route.
  if (typeof newData.slug === 'string') newData.slug = newSlug;
  if (typeof newData.routeSlug === 'string') newData.routeSlug = newSlug;
  if (typeof newData.pagePath === 'string') newData.pagePath = `/${name}/${newSlug}/`;
  const createdEntry = await core.createEntry({
    collection: name, slug: newSlug, frontmatter: newData,
    body: richBody ? entry.content : undefined,
    fileExtension: definition.fileExtension,
  });
  assert.equal(createdEntry.success, true, `${name}: create succeeds (${createdEntry.error ?? ''})`);
  const rescanned = (await core.scanCollections())[name];
  assert.ok(rescanned.entries?.some(e => e.slug === newSlug), `${name}: created entry appears in the collection (${createdEntry.sourcePath}; found ${rescanned.entries?.filter(e => e.sourcePath.includes('cms-verification')).map(e => e.slug).join(',')})`);
  // Nua may add a slug derived from the filename. Verify every value we sent,
  // while allowing that generated field to vary across package versions.
  const reread = (await core.getEntry(name, newSlug))?.frontmatter;
  assert.ok(reread, `${name}: created entry re-reads`);
  if (richBody) assert.equal((await core.getEntry(name, newSlug))?.content, entry.content, `${name}: visual body survives create/read`);
  for (const key of Object.keys(newData)) {
    assert.equal(JSON.stringify(reread[key]), JSON.stringify(newData[key]), `${name}: ${key} survives create/read`);
  }
  created++;
  const deletedEntry = await core.deleteEntry(name, newSlug);
  assert.equal(deletedEntry.success, true, `${name}: delete succeeds (${deletedEntry.error ?? ''})`);
  assert.equal(await core.getEntry(name, newSlug), null, `${name}: deleted entry is absent`);
  assert.ok(!(await core.scanCollections())[name].entries?.some(e => e.slug === newSlug), `${name}: deleted entry leaves the collection`);
  deleted++;

  if (['zpravodaj-articles', 'pristupnost-gallery'].includes(name)) {
    const minimal: Record<string, unknown> = { parent: entry.frontmatter.parent, order: 1 };
    if (name === 'zpravodaj-articles') minimal.title = 'CMS verification article';
    if (name === 'pristupnost-gallery') minimal.pic = entry.frontmatter.pic;
    const minimalSlug = `${newSlug}-minimal`;
    const missingParent = await core.createEntry({
      collection: name, slug: minimalSlug, frontmatter: { ...minimal, parent: '' },
      fileExtension: definition.fileExtension,
    });
    assert.equal(missingParent.success, false, `${name}: parent is required in new-entry form`);
    const minimalEntry = await core.createEntry({
      collection: name, slug: minimalSlug, frontmatter: minimal,
      fileExtension: definition.fileExtension,
    });
    assert.equal(minimalEntry.success, true, `${name}: minimal new entry with selected parent saves`);
    assert.deepEqual((await core.getEntry(name, minimalSlug))?.frontmatter, minimal, `${name}: minimal entry re-reads`);
    assert.equal((await core.deleteEntry(name, minimalSlug)).success, true, `${name}: minimal entry deletes`);
    minimalCreated++;
  }
}
for (const name of ['aktualne', 'aktualne-en']) {
  const fields = collections[name].fields;
  assert.equal(fields.find(field => field.name === 'perex')?.type, 'textarea');
  assert.equal(fields.find(field => field.name === 'routeSlug'), undefined);
  assert.equal(fields.find(field => field.name === 'oldUrl'), undefined);
  assert.equal(fields.find(field => field.name === (name === 'aktualne' ? 'obrazek' : 'illustration'))?.type, 'image');
}
for (const name of ['dokument', 'dokument-en', 'eso']) {
  assert.equal(collections[name].fields.find(field => field.name === 'perex')?.type, 'textarea', `${name}: lead text has a rich editor`);
}
for (const name of ['zpravodaj', 'situace', 'situace-en', 'vystupy', 'vystupy-en', 'alert', 'alert-en']) {
  const legacyBody = collections[name].fields.find(field => field.name === 'body');
  assert.equal(legacyBody, undefined, `${name}: unused legacy body is not offered to editors`);
}
for (const name of ['aktualne', 'aktualne-en', 'dokument', 'dokument-en', 'eso']) {
  const definition = collections[name];
  const sample = definition.entries?.[0];
  assert.ok(sample, `${name}: sample entry exists`);
  const slug = sample.slug ?? sample.sourcePath.slice(definition.path.length + 1).replace(/\.(md|ya?ml)$/, '');
  const entry = await core.getEntry(name, slug);
  assert.ok(entry, `${name}: lead text sample is readable`);
  const next = { ...entry.frontmatter, perex: '**Edited lead** with [a link](https://example.com)' };
  assert.equal((await core.updateEntry({ collection: name, slug, frontmatter: next, body: entry.content })).success, true, `${name}: lead text saves`);
  assert.equal((await core.getEntry(name, slug))?.frontmatter.perex, next.perex, `${name}: lead text survives a reload`);
}
for (const [name, parent] of [
  ['zpravodaj-articles', 'zpravodaj'],
]) {
  const field = collections[name].fields.find(field => field.name === 'parent');
  assert.equal(field?.type, 'reference', `${name}: parent selector is shown in the new-entry form`);
  assert.equal(field?.collection, parent, `${name}: parent selector points to ${parent}`);
  assert.equal(field?.required, true, `${name}: parent must be selected before creation`);
}
for (const [name, target] of [['letaky', 'situace'], ['letaky-en', 'situace-en']] as const) {
  const situations = collections[name].fields.find(field => field.name === 'situace');
  assert.equal(situations?.type, 'array', `${name}: situations use a multiple-value control`);
  assert.equal(situations?.itemType, 'reference', `${name}: each situation is an existing entry picker`);
  assert.equal(situations?.collection, target, `${name}: situation picker uses the matching language`);
  assert.equal(situations?.fields, undefined, `${name}: situation picker is flat rather than a nested slug form`);
  const attachments = collections[name].fields.find(field => field.name === 'attachments');
  assert.equal(attachments, undefined, `${name}: obsolete attachment field is absent from the editor and source records`);
}
const leafletAttachments = JSON.parse(readFileSync('src/lib/leaflet-attachments.json', 'utf8')) as Record<'cs' | 'en', Record<string, unknown[]>>;
assert.ok(Object.keys(leafletAttachments.cs).length > 0 && Object.keys(leafletAttachments.en).length > 0, 'historical leaflet links remain in public rendering data');
assert.equal(collections.homepage.entryCount, 1, 'Czech homepage has its own collection');
assert.equal(collections['homepage-en'].entryCount, 1, 'English homepage has its own collection');
assert.equal(collections['podejte-stiznost'].entryCount, 1, 'complaint collection only contains its landing page');
assert.equal(collections['podejte-stiznost-en'].entryCount, 1, 'English complaint collection only contains its landing page');
assert.equal(collections['provoz-en'].entryCount, 1, 'English operations contains no stale Czech drafts');
assert.ok(!collections.provoz.entries?.some(entry => entry.slug === 'press-kit'), 'nonexistent Czech press kit is absent');
for (const name of ['section-pages', 'section-pages-en', 'site-settings', 'kontakt', 'kontakt-en', 'o-nas', 'o-nas-en', 'nas-pribeh', 'pro-media', 'kontrola', 'kontrola-en', 'newsletter', 'manual', 'hledat', 'hledat-en', 'style', 'vyzkumy-vse', 'zpravodaj-vse', 'pristupnost-gallery']) {
  assert.equal(collections[name], undefined, `${name}: ordinary page copy is not a CMS collection`);
}
for (const name of ['homepage', 'homepage-en']) {
  assert.equal(collections[name].fields.some(f => f.name === 'categories'), false, `${name}: ambiguous news category control is removed`);
}
for (const [name, categoryCollection] of [
  ['dokument', 'vystupy'], ['dokument-en', 'vystupy-en'],
]) {
  const field = collections[name].fields.find(f => f.name === 'vystupy');
  assert.equal(field?.itemType, 'reference', `${name}: category is a direct picker`);
  assert.equal(field?.collection, categoryCollection, `${name}: category uses the matching language`);
}
for (const name of ['eso', 'aktualne', 'aktualne-en', 'dokument', 'dokument-en']) {
  assert.equal(collections[name].type, undefined, `${name}: main text is a WYSIWYG Markdown body`);
  assert.equal(collections[name].fields.some(f => f.name === 'body'), false, `${name}: main text is not a plain frontmatter input`);
  assert.equal(collections[name].orderBy, 'date', `${name}: records support publication-date ordering`);
}
assert.match(await renderMarkdown('::youtube{#dQw4w9WgXcQ}'), /youtube\.com\/embed\/dQw4w9WgXcQ/, 'editor YouTube embeds render on the site');

const czechGdpr = readFileSync('src/content/provoz/gdpr-a-ochrana-osobnich-udaju.md', 'utf8');
const englishGdpr = readFileSync('src/content/provoz-en/gdpr-a-ochrana-osobnich-udaju.md', 'utf8');
assert.match(czechGdpr, /::youtube\{#9cpwDVL7BU0\}/, 'Czech GDPR video uses the editor-supported YouTube block');
assert.doesNotMatch(englishGdpr, /\[\^\d+\]/, 'English GDPR avoids unsupported footnote controls');
assert.match(englishGdpr, /## Notes\n\n1\./, 'English GDPR notes use an editable ordered list');

for (const slug of ['braille', 'czj']) {
  const source = readFileSync(`src/components/page-content/podejte-stiznost/${slug}.astro`, 'utf8');
  assert.match(source, /Page copy edited directly with Nua's live text and image editor/, `${slug}: detail is a live source page`);
}
for (const name of ['podejte-stiznost', 'podejte-stiznost-en']) {
  const fields = collections[name].fields;
  assert.equal(fields.find(field => field.name === 'introIcon')?.type, 'image', `${name}: introduction icon is uploadable`);
  for (const method of ['online', 'emailMethod', 'postMethod', 'inpersonMethod']) {
    assert.equal(fields.find(field => field.name === method)?.fields?.find(field => field.name === 'icon')?.type, 'image', `${name}.${method}: icon is uploadable`);
  }
}
const editorToolbar = readFileSync('node_modules/@nuasite/cms/src/editor/components/toolbar.tsx', 'utf8');
assert.match(editorToolbar, /collectionManagementEnabled && currentPageCollection && callbacks\.onEditContent/, 'legacy black collection editor is disabled with collection management');
assert.match(readFileSync('src/scripts/index.js', 'utf8'), /setupLegacyCollectionEditorGuard/, 'hosted CDN editor is guarded on every page');

const server = createServer({ core, fs: disk, root: process.cwd(), coreVersion: 'verification' });
const navigation = await (await server.fetch(new Request('http://localhost/cms/v1/collections'))).json() as Array<{ name: string; label: string }>;
assert.ok(!navigation.some(c => c.name === 'hledat' || c.name === 'hledat-en'), 'search configuration is hidden from collection navigation');
assert.ok(!navigation.some(c => c.name === 'pristupnost-gallery'), 'accessibility gallery is hidden from collection navigation');
assert.equal(navigation.find(c => c.name === 'dokument-en')?.label, 'Documents', 'English collection label reaches the dashboard');
assert.equal(navigation.find(c => c.name === 'homepage-en')?.label, 'Homepage', 'English homepage is visible separately');
assert.equal(navigation.find(c => c.name === 'potrebuji-pomoc')?.label, 'Potřebuji pomoc', 'Czech help pages are visible as a collection');
assert.equal(navigation.find(c => c.name === 'potrebuji-pomoc-en')?.label, 'I need help', 'English help pages are visible as a collection');
assert.ok(!navigation.some(c => c.name === 'section-pages' || c.name === 'section-pages-en'), 'section-page records are edited from page context rather than collection navigation');
assert.ok(!navigation.some(c => c.name === 'site-settings'), 'site chrome is edited directly, not in a mixed settings collection');
const newest = await (await server.fetch(new Request('http://localhost/cms/v1/collections/aktualne/entries?sort=desc&limit=1'))).json() as { entries: Array<{ slug: string }> };
const oldest = await (await server.fetch(new Request('http://localhost/cms/v1/collections/aktualne/entries?sort=asc&limit=1'))).json() as { entries: Array<{ slug: string }> };
assert.notEqual(newest.entries[0]?.slug, oldest.entries[0]?.slug, 'date sorting works in both directions before pagination');

const mediaIndex = JSON.parse(readFileSync('src/lib/content-media.json', 'utf8')) as Array<{ url: string; contentType: string }>;
assert.ok(mediaIndex.length > 6000, 'legacy referenced media is indexed');
assert.ok(mediaIndex.filter(item => item.contentType.startsWith('image/')).length > 900, 'legacy photos are indexed');
const mediaCore = createCmsCore(disk, { media: {
  list: async () => ({ items: [], folders: [], hasMore: false }),
  upload: async () => ({ success: false }),
  delete: async () => ({ success: false }),
} });
const mediaServer = createServer({ core: mediaCore, fs: disk, root: process.cwd(), coreVersion: 'verification' });
const mediaPage = await (await mediaServer.fetch(new Request('http://localhost/cms/v1/media?includeProjectImages=true&limit=1000'))).json() as { items: Array<{ url: string }>; hasMore: boolean; cursor?: string };
assert.ok(mediaPage.items.some(item => item.url.startsWith('https://cdn.nuasite.com/assets/')), 'referenced CDN media reaches the picker');
assert.equal(mediaPage.hasMore, true, 'media browser paginates the full historical library');
assert.ok(mediaPage.cursor, 'media browser can load the next page');
console.log(`Verified ${report.collections} collections, ${report.entries} entries, ${saved} edit/save, ${created} create, and ${deleted} delete round trips in memory; ${minimalCreated} child entries save from required fields only.`);
