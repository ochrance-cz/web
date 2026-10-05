import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createCmsCore, createNodeFs } from '@nuasite/cms-core';
import { createServer } from '@nuasite/cms-sidecar';
import { getLeafletAttachments } from '../src/lib/leaflet-attachments';

// Check the actual sidecar contract consumed by the Nua admin. A route derived
// directly from the schema can be correct while the editor still receives no
// preview target, or lists an unbuilt draft as a published page.
const root = process.cwd();
const fs = createNodeFs(root);
const core = createCmsCore(fs);
const server = createServer({ core, fs, root, coreVersion: 'verification' });
const collections = await core.scanCollections();
let published = 0;
let drafts = 0;

for (const [name, definition] of Object.entries(collections)) {
  const sourceEntries = new Map(definition.entries?.map(entry => [entry.slug, entry]) ?? []);
  const seen = new Set<string>();
  assert.ok(definition.fragment ? definition.previewOf : definition.pathname, `${name}: no preview rule`);
  let cursor: string | undefined;
  do {
    const url = new URL(`http://localhost/cms/v1/collections/${name}/entries`);
    url.searchParams.set('limit', '1000');
    url.searchParams.set('draft', 'all');
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await server.fetch(new Request(url));
    assert.equal(response.status, 200, `${name}: sidecar list succeeds`);
    const page = await response.json() as {
      entries: Array<{ slug: string; draft?: boolean; pathname?: string; previewPathname?: string }>;
      cursor?: string;
    };
    for (const entry of page.entries) {
      assert.ok(!seen.has(entry.slug), `${name}/${entry.slug}: listed twice`);
      seen.add(entry.slug);
      const source = sourceEntries.get(entry.slug);
      assert.ok(source, `${name}/${entry.slug}: listed record exists`);
      if (name === 'zpravodaj-articles' && typeof source.data?.parent === 'string') {
        assert.equal(entry.pathname?.replace(/\/$/, ''), `/zpravodaj/clanky/${encodeURIComponent(entry.slug)}`, `${name}/${entry.slug}: preview has its own ordinary page`);
      }
      assert.equal(entry.draft === true, source.data?.draft === true, `${name}/${entry.slug}: draft status matches content`);
      if (entry.draft) {
        assert.equal(definition.supportsDraft, true, `${name}: draft toggle is available`);
        drafts++;
        continue;
      }
      const target = entry.pathname ?? entry.previewPathname;
      assert.ok(target, `${name}/${entry.slug}: editor needs a preview target`);
      if (definition.fragment) assert.equal(entry.pathname, undefined, `${name}/${entry.slug}: fragment must not claim a page`);
      const route = target.replace(/^\/+|\/+$/g, '');
      const html = `${root}/dist/${route ? `${route}/` : ''}index.html`;
      assert.ok(existsSync(html), `${name}/${entry.slug}: editor preview ${target} is missing (${html})`);
      if (name === 'letaky' || name === 'letaky-en') {
        const rendered = readFileSync(html, 'utf8').replaceAll('&amp;', '&');
        for (const field of ['file', 'seeing', 'roma', 'kids']) {
          const value = source.data?.[field];
          if (typeof value === 'string' && value) {
            assert.ok(rendered.includes(value), `${name}/${entry.slug}: ${field} is editable but absent from its preview`);
          }
        }
        const locale = name === 'letaky-en' ? 'en' : 'cs';
        const attachments = getLeafletAttachments(locale, entry.slug);
        for (const attachment of attachments) {
            if (typeof attachment !== 'object' || attachment === null) continue;
            const value = 'file' in attachment ? attachment.file : 'link' in attachment ? attachment.link : undefined;
            if (typeof value === 'string' && value) {
              assert.ok(rendered.includes(value), `${name}/${entry.slug}: historical attachment disappeared from its public page`);
            }
        }
      }
      published++;
    }
    cursor = page.cursor;
  } while (cursor);
  assert.equal(seen.size, sourceEntries.size, `${name}: sidecar omits records`);
  if (definition.supportsDraft) {
    const response = await server.fetch(new Request(`http://localhost/cms/v1/collections/${name}/entries?limit=1000`));
    assert.equal(response.status, 200, `${name}: published list succeeds`);
    const page = await response.json() as { entries: Array<{ slug: string; draft?: boolean }> };
    assert.ok(page.entries.every(entry => !entry.draft && sourceEntries.get(entry.slug)?.data?.draft !== true), `${name}: unpublished records appear in the published list`);
  }
}

console.log(`Verified Nua sidecar preview routes for ${published} published entries in ${Object.keys(collections).length} collections; ${drafts} drafts are marked as unpublished.`);
