/** Exercise the Czech contact directory through real CMS writes and rendered pages.
 * Requires the local dev server (CMS_VERIFY_URL defaults to http://127.0.0.1:4333).
 * Only unique verification records are written, then deleted in finally.
 */
import assert from 'node:assert/strict';
import { createCmsCore, createNodeFs } from '@nuasite/cms-core';
import { parse } from 'node-html-parser';

const core = createCmsCore(createNodeFs(process.cwd()));
const base = process.env.CMS_VERIFY_URL ?? 'http://127.0.0.1:4333';
const suffix = `${Date.now()}`;
const departmentA = `verification-contact-a-${suffix}`;
const departmentB = `verification-contact-b-${suffix}`;
const personSlug = `verification-person-${suffix}`;
const personTitle = `Ověření propojení ${suffix}`;
const staffTitle = `Ověřovací kolega ${suffix}`;
const created: Array<[string, string]> = [];
const baseline = await core.scanCollections();
const expectedPeople = baseline.lide.entries!.filter(entry => entry.data?.visible !== false).map(entry => String(entry.data!.title)).sort();
assert(expectedPeople.length > 100, 'Baseline directory is unexpectedly empty');

async function create(collection: string, slug: string, frontmatter: Record<string, unknown>) {
  const result = await core.createEntry({ collection, slug, frontmatter, fileExtension: 'yaml' });
  assert(result.success, `${collection}: ${result.error}`);
  created.push([collection, slug]);
}
async function pagesMatch(check: (doc: ReturnType<typeof parse>, lang: 'cs' | 'en') => void) {
  for (const lang of ['cs'] as const) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        const response = await fetch(`${base}${lang === 'en' ? '/en' : ''}/provoz/kontakty/`);
        assert(response.ok, `${lang}: HTTP ${response.status}`);
        check(parse(await response.text()), lang);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    if (lastError) throw lastError;
  }
}
function allExistingContacts(doc: ReturnType<typeof parse>) {
  const names = doc.querySelectorAll('._provoz-people strong').map(node => node.textContent).filter(name => name !== personTitle && name !== staffTitle).sort();
  assert.deepEqual(names, expectedPeople, 'Existing contacts were omitted or duplicated');
}

try {
  await pagesMatch(doc => allExistingContacts(doc));
  await create('oddeleni', departmentA, { title: 'Ověřovací oddělení A', order: -2 });
  await create('oddeleni', departmentB, { title: 'Ověřovací oddělení B', order: -1 });
  const person = { title: personTitle, department: departmentA, role: 'Ověřovací role', departmentHead: true, visible: true, order: 1, email: 'verify@example.com', phone: '123 456 789' };
  await create('lide', personSlug, person);
  await create('lide', `${personSlug}-staff`, { title: staffTitle, department: departmentA, departmentHead: false, order: -100 });
  await pagesMatch((doc, lang) => {
    allExistingContacts(doc);
    const group = doc.querySelectorAll('._provoz-section').find(section => section.querySelector('h2')?.textContent === 'Ověřovací oddělení A');
    assert(group?.textContent.includes(personTitle), `${lang}: new person is not in selected department`);
    assert(group.textContent.includes('Ověřovací role'));
    assert.equal(group.querySelector('._provoz-people strong')?.textContent, personTitle, 'The head appears first even when another employee has a lower order');
  });
  assert((await core.updateEntry({ collection: 'lide', slug: personSlug, frontmatter: { ...person, department: departmentB } })).success);
  await pagesMatch((doc, lang) => {
    allExistingContacts(doc);
    const groups = doc.querySelectorAll('._provoz-section');
    const target = groups.find(section => section.querySelector('h2')?.textContent === 'Ověřovací oddělení B');
    assert(target?.textContent.includes(personTitle), `${lang}: department move not rendered`);
    const old = groups.find(section => section.querySelector('h2')?.textContent === 'Ověřovací oddělení A');
    assert(!old?.textContent.includes(personTitle));
  });
  assert((await core.updateEntry({ collection: 'lide', slug: personSlug, frontmatter: { ...person, department: departmentB, visible: false } })).success);
  await pagesMatch(doc => {
    allExistingContacts(doc);
    assert(!doc.textContent.includes(personTitle), 'Archived contact still appears');
  });
  assert((await core.updateEntry({ collection: 'lide', slug: personSlug, frontmatter: person })).success);
  await pagesMatch(doc => assert(doc.textContent.includes(personTitle), 'Restored contact is missing'));
  console.log(`Verified ${expectedPeople.length} existing people on the Czech contact route, head before lower-order staff, new department/person, assignment changes, archive and restore through real CMS writes.`);
} finally {
  for (const [collection, slug] of created.reverse()) {
    const result = await core.deleteEntry(collection, slug);
    assert(result.success, `Verification record cleanup failed: ${collection}/${slug}: ${result.error}`);
  }
}
