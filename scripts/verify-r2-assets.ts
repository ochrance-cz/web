/** Verify the retained local files; --remote also verifies every CDN object's SHA-256. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import manifest from './fixtures/r2-assets.json';

const digest = (bytes: ArrayBuffer) => createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const urls = new Set<string>();
for (const asset of manifest.assets) {
  assert.equal(asset.localPath, `public${asset.originalPath}`);
  assert(!asset.originalPath.split('/').includes('..'));
  const url = new URL(asset.url);
  assert.equal(url.origin, 'https://cdn.nuasite.com');
  assert(url.pathname.startsWith(`/assets/${manifest.project}/`));
  assert(!urls.has(asset.url), `Duplicate CDN URL: ${asset.url}`);
  urls.add(asset.url);
  const local = await Bun.file(asset.localPath).arrayBuffer();
  assert.equal(local.byteLength, asset.bytes, `${asset.localPath}: size changed`);
  assert.equal(digest(local), asset.sha256, `${asset.localPath}: retained bytes changed`);
}
console.log(`Verified ${manifest.assets.length} retained local assets and their CDN mappings.`);

if (process.argv.includes('--remote')) {
  const queue = [...manifest.assets];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (;;) {
      const asset = queue.pop();
      if (!asset) break;
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
      assert.equal(response.status, 200, `${asset.url}: HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      assert.equal(bytes.byteLength, asset.bytes, `${asset.url}: wrong size`);
      assert.equal(digest(bytes), asset.sha256, `${asset.url}: CDN bytes differ`);
    }
  }));
  console.log(`Verified all ${manifest.assets.length} CDN objects byte for byte.`);
}
