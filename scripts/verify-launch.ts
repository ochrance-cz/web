/** Verify the captured production sitemap and imported file bytes against a build. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import snapshot from './fixtures/launch-snapshot.json';

const rules = readFileSync('dist/_redirects', 'utf8').split('\n')
  .map(line => line.trim()).filter(line => line && !line.startsWith('#'))
  .map(line => {
    const [from, to, status = '301'] = line.split(/\s+/);
    const names: string[] = [];
    const pattern = from.split('/').map(part => {
      if (part === '*') { names.push('splat'); return '(.*)'; }
      if (part.startsWith(':')) { names.push(part.slice(1)); return '([^/]+)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    return { from, to, status: Number(status), names, re: new RegExp(`^${pattern}$`) };
  });
// macOS commonly uses a case-insensitive filesystem; deployed paths do not.
const files = new Map<string, string>();
function indexFiles(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) indexFiles(path);
    else files.set(path.normalize('NFC'), path);
  }
}
indexFiles('dist');
function resolve(url: string) {
  let path = new URL(url, 'https://example.test').pathname;
  const seen = new Set<string>();
  for (;;) {
    assert(!seen.has(path), `Redirect cycle: ${url} -> ${path}`);
    seen.add(path);
    // Match decoded URLs, including legacy Unicode filenames.
    const rule = rules.find(rule => rule.re.test(decodeURI(path)) || rule.re.test(path));
    if (!rule) break;
    const match = rule.re.exec(decodeURI(path)) ?? rule.re.exec(path)!;
    let target = rule.to;
    rule.names.forEach((name, i) => { target = target.replaceAll(`:${name}`, match[i + 1]); });
    assert(!/^https?:/.test(target), `${url} unexpectedly leaves the site: ${target}`);
    path = target;
    if (rule.status === 200) break; // rewrites are not evaluated again
  }
  const file = `dist${decodeURIComponent(path).replace(/\/$/, '')}`;
  const target = files.get(file.normalize('NFC')) ?? files.get(`${file}/index.html`.normalize('NFC'));
  assert(target, `${url} resolves to missing ${file}/index.html (case-sensitive)`);
  return target;
}
const failures: string[] = [];
for (const url of snapshot.urls) {
  try { resolve(url); } catch (error) { failures.push(String(error)); }
}
assert.equal(failures.length, 0, failures.join('\n'));
for (const [path, expected] of Object.entries(snapshot.assets)) {
  const file = resolve(path);
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), expected, `${path}: imported bytes changed`);
}
console.log(`Verified ${snapshot.urls.length} published URLs and ${Object.keys(snapshot.assets).length} imported assets from ${snapshot.capturedAt}.`);
