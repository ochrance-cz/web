/** Exercise individual person/department previews and archive behavior against a running Nua renderer. */
import assert from 'node:assert/strict';
import { createCmsCore, createNodeFs } from '@nuasite/cms-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
const core = createCmsCore(createNodeFs(process.cwd()));
const base = process.env.CMS_VERIFY_URL ?? 'http://127.0.0.1:4340';
const definitions = await core.scanCollections();
const originalEntry = definitions.lide.entries!.find(entry => entry.data?.visible !== false)!;
const file = originalEntry.sourcePath;
const original = readFileSync(file, 'utf8');
const person = { ...originalEntry.data };
const nextDepartment = definitions.oddeleni.entries!.find(entry => entry.slug !== person.department)!;
async function check(path: string, verify: (doc: ReturnType<typeof parse>) => void) {
  let lastError: unknown;
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert(!/TypeError:|ReferenceError:/.test(html), path);
      const doc = parse(html);
      verify(doc); return;
    } catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 150)); }
  }
  throw lastError;
}
const path = `/provoz/lide/${originalEntry.slug}/`;
try {
  await check(path, doc => {
    assert(doc.querySelector('main')!.textContent.includes(String(person.title)));
    assert.equal(doc.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex, nofollow');
    assert(doc.querySelector('main')?.hasAttribute('data-pagefind-ignore'));
  });
  const updated = { ...person, department: nextDepartment.slug, role: 'Ověření náhledu člověka', email: 'preview-verification@example.com' };
  assert((await core.updateEntry({ collection: 'lide', slug: originalEntry.slug, frontmatter: updated })).success);
  await check(path, doc => {
    const main = doc.querySelector('main')!;
    assert(main.textContent.includes('Ověření náhledu člověka'));
    assert(main.textContent.includes(String(nextDepartment.data!.title)));
    assert(main.querySelector('a[href="mailto:preview-verification@example.com"]'));
  });
  await check(`/provoz/oddeleni/${nextDepartment.slug}/`, doc => assert(doc.querySelector('main')!.textContent.includes('Ověření náhledu člověka')));
  assert((await core.updateEntry({ collection: 'lide', slug: originalEntry.slug, frontmatter: { ...updated, visible: false } })).success);
  await check(path, doc => {
    assert(doc.querySelector('main')!.textContent.includes('archivovaný'));
    assert(!doc.textContent.includes(String(person.title)), 'Archived name leaked into preview');
    assert(!doc.textContent.includes('preview-verification@example.com'), 'Archived email leaked into preview');
  });
  console.log('Verified person/department preview, name/role/email, department move, archive hiding and search exclusion through real CMS saves.');
} finally {
  writeFileSync(file, original);
  assert.equal(readFileSync(file, 'utf8'), original);
}
