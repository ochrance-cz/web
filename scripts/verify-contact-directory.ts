import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCmsCore, createNodeFs, globToRegExp } from '@nuasite/cms-core';
import { createServer } from '@nuasite/cms-sidecar';
import { contactGroups, type ContactDepartment, type ContactPerson } from '../src/lib/contact-directory';

// Exercise real CMS writes in memory; verification never changes the directory.
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

const definitions = await core.scanCollections();
assert.ok(!definitions['provoz-kontakty'].fields.some(field => field.name === 'lawyers'), 'contact page has no duplicate people editor');
assert.equal(definitions['provoz-kontakty-en'], undefined, 'Confirmed-unused English contact collection is absent');
const departmentField = definitions.lide.fields.find(field => field.name === 'department');
assert.equal(departmentField?.type, 'reference', 'people choose a department from existing entries');
assert.equal(departmentField?.collection, 'oddeleni');
assert.equal(departmentField?.required, true);
assert.equal(definitions.lide.fields.find(field => field.name === 'visible')?.type, 'boolean', 'archive is a checkbox');
assert.equal(definitions.lide.fields.find(field => field.name === 'departmentHead')?.type, 'boolean', 'department head is an explicit checkbox');
for (const name of ['lide', 'oddeleni']) {
  assert.notEqual(definitions[name].fragment, true);
  assert.deepEqual(definitions[name].pathname, [{ literal: 'provoz' }, { literal: name }, { field: 'slug' }], 'each directory record has a direct preview');
}
const server = createServer({ core, fs: disk, root: process.cwd(), coreVersion: 'contact-verification' });
const groups = async () => {
  const collections = await core.scanCollections();
  const departments = collections.oddeleni.entries!.map(entry => ({ id: entry.slug, data: entry.data })) as ContactDepartment[];
  const people = collections.lide.entries!.map(entry => ({ id: entry.slug, data: entry.data })) as ContactPerson[];
  for (const person of people) assert.ok(departments.some(department => department.id === person.data.department), `${person.id}: assigned department exists`);
  return contactGroups(departments, people);
};
const initial = await groups();
for (const entry of definitions.lide.entries!.filter(entry => entry.data?.departmentHead === true && entry.data.visible !== false)) {
  const department = definitions.oddeleni.entries!.find(department => department.slug === entry.data!.department)!;
  assert.equal(initial.find(group => group.title === department.data!.title)?.people[0].name, entry.data!.title, `${entry.data!.title}: existing department head is first`);
}
const firstDepartment = definitions.oddeleni.entries![0].slug;
const firstTitle = definitions.oddeleni.entries![0].data!.title;
const otherDepartment = definitions.oddeleni.entries![1].slug;
const otherTitle = definitions.oddeleni.entries![1].data!.title;
const slug = 'verification-contact';
const person = { title: 'Ověření kontaktu', department: firstDepartment, departmentHead: true, visible: true, role: 'Právník', email: 'test@example.com', phone: '123 456 789', order: -1 };
assert.equal((await core.createEntry({ collection: 'lide', slug, frontmatter: { title: person.title }, fileExtension: definitions.lide.fileExtension })).success, false, 'new person requires a department');
const creation = await core.createEntry({ collection: 'lide', slug, frontmatter: person, fileExtension: definitions.lide.fileExtension });
assert.equal(creation.success, true, `create person: ${creation.error ?? ''}`);
let current = await groups();
assert.equal(current.find(group => group.title === firstTitle)?.people[0].name, person.title, 'new person appears in selected department/order');
const edited = { ...person, title: 'Upravený kontakt', role: 'Vedoucí', email: 'updated@example.com', phone: '987 654 321' };
assert.equal((await core.updateEntry({ collection: 'lide', slug, frontmatter: edited })).success, true, 'edit name/function/email/phone');
assert.deepEqual((await groups()).find(group => group.title === firstTitle)?.people[0], { name: edited.title, role: edited.role, email: edited.email, phone: edited.phone, order: edited.order, departmentHead: true });
const archived = { ...edited, visible: false };
assert.equal((await core.updateEntry({ collection: 'lide', slug, frontmatter: archived })).success, true);
assert.ok(!(await groups()).some(group => group.people.some(person => person.name === edited.title)), 'archived person is absent from rendered groups');
assert.deepEqual((await core.getEntry('lide', slug))?.frontmatter, archived, 'archived person retains all details');
assert.equal((await core.updateEntry({ collection: 'lide', slug, frontmatter: edited })).success, true);
assert.equal((await groups()).find(group => group.title === firstTitle)?.people[0].name, edited.title, 'restore archived person');
const moved = { ...edited, department: otherDepartment };
assert.equal((await core.updateEntry({ collection: 'lide', slug, frontmatter: moved })).success, true);
current = await groups();
assert.ok(!current.find(group => group.title === firstTitle)?.people.some(person => person.name === edited.title), 'move removes person from previous department');
assert.equal(current.find(group => group.title === otherTitle)?.people[0].name, edited.title, 'move inserts person in new department');
const newDepartment = 'verification-department';
const department = { title: 'Nové oddělení', order: -1, intro: 'Nová agenda' };
assert.equal((await core.createEntry({ collection: 'oddeleni', slug: newDepartment, frontmatter: department, fileExtension: definitions.oddeleni.fileExtension })).success, true, 'create a new department');
const response = await server.fetch(new Request('http://localhost/cms/v1/collections/oddeleni/entries?limit=1000'));
assert.equal(response.status, 200);
const options = await response.json() as { entries: Array<{ slug: string }> };
assert.ok(options.entries.some(entry => entry.slug === newDepartment), 'new department is available in the reference picker');
assert.equal((await core.updateEntry({ collection: 'lide', slug, frontmatter: { ...moved, department: newDepartment } })).success, true);
current = await groups();
assert.equal(current[0].title, department.title, 'department ordering reaches the page');
assert.equal(current[0].people[0].name, edited.title, 'person moves to a newly created department');
assert.equal((await core.deleteEntry('lide', slug)).success, true);
assert.equal((await core.deleteEntry('oddeleni', newDepartment)).success, true);
assert.deepEqual(await groups(), initial, 'deleting test records restores the directory');
const minimal = { title: 'Nový kolega', department: firstDepartment };
assert.equal((await core.createEntry({ collection: 'lide', slug, frontmatter: minimal, fileExtension: definitions.lide.fileExtension })).success, true, 'new person only needs name and department');
assert.ok((await groups()).find(group => group.title === firstTitle)?.people.some(person => person.name === minimal.title), 'new person is visible with optional fields omitted');
assert.equal((await core.deleteEntry('lide', slug)).success, true);
assert.deepEqual(await groups(), initial);

const orderingDepartment = [{ id: 'ordering', data: { title: 'Ověření pořadí' } }];
const orderingPeople: ContactPerson[] = [
  { id: 'staff', data: { title: 'První zaměstnanec', department: 'ordering', order: -100 } },
  { id: 'head', data: { title: 'Vedoucí', department: 'ordering', departmentHead: true, order: 999 } },
  { id: 'later', data: { title: 'Další zaměstnanec', department: 'ordering', order: 10 } },
  { id: 'archived', data: { title: 'Bývalý vedoucí', department: 'ordering', departmentHead: true, visible: false, order: -1000 } },
];
assert.deepEqual(contactGroups(orderingDepartment, orderingPeople)[0].people.map(person => person.name), ['Vedoucí', 'První zaměstnanec', 'Další zaměstnanec'], 'a department head precedes lower staff order values; archived heads remain hidden');
orderingPeople[1].data.departmentHead = false;
assert.deepEqual(contactGroups(orderingDepartment, orderingPeople)[0].people.map(person => person.name), ['První zaměstnanec', 'Další zaměstnanec', 'Vedoucí'], 'clearing the head checkbox restores numeric ordering');

if (process.argv.includes('--built')) {
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  for (const prefix of ['']) {
    const html = readFileSync(`dist/${prefix}provoz/kontakty/index.html`, 'utf8');
    for (const group of await groups()) {
      assert.ok(html.includes(escape(group.title!)), `${prefix}${group.title}: department renders`);
      for (const person of group.people) {
        for (const value of [person.name, person.role, person.phone, person.email].filter(Boolean)) {
          assert.ok(html.includes(escape(value!)), `${prefix}${person.name}: ${value} renders`);
        }
      }
    }
  }
}
console.log(`Verified ${initial.reduce((count, group) => count + group.people.length, 0)} contact people, department picker/create, edit, archive/restore, department moves, ordering, deletion and preview targets${process.argv.includes('--built') ? ', plus built-page coverage' : ''}.`);
