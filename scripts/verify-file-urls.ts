/** Verify that a build for Cloudflare links to files on the site itself, not on the CDN. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CDN_ASSETS, rewriteFileUrls, rewriteRedirects } from '../src/lib/own-origin-files';

const SITE = 'https://www.ochrance.cz';
const rewritten = (text: string) => rewriteFileUrls(text, SITE);

assert.equal(
  rewritten(`<a href="${CDN_ASSETS}/info106/2013/a.pdf">${CDN_ASSETS}/info106/2013/a.pdf</a>`),
  `<a href="/info106/2013/a.pdf">${SITE}/info106/2013/a.pdf</a>`
);
assert.equal(rewritten(`<a href="${CDN_ASSETS}/a/b%20(1).PDF?fbclid=x">`), '<a href="/a/b%20(1).PDF?fbclid=x">');
// A linked photo is a file, whatever a page embeds is not.
assert.equal(
  rewritten(`<a href="${CDN_ASSETS}/a/foto.jpg"><img src="${CDN_ASSETS}/a/foto.jpg"></a>`),
  `<a href="/a/foto.jpg"><img src="${CDN_ASSETS}/a/foto.jpg"></a>`
);
assert.equal(rewritten(`<video src="${CDN_ASSETS}/a/film.mov">`), `<video src="${CDN_ASSETS}/a/film.mov">`);
// The Worker only looks up paths with a file extension; any other link has to stay where it works.
assert.equal(rewritten(`<a href="${CDN_ASSETS}/media/soubor">`), `<a href="${CDN_ASSETS}/media/soubor">`);
// Markdown left in a summary: every URL is judged on its own.
assert.equal(
  rewritten(`[a](${CDN_ASSETS}/a.pdf).[b](${CDN_ASSETS}/b.pdf)![c](${CDN_ASSETS}/c.png)`),
  `[a](${SITE}/a.pdf).[b](${SITE}/b.pdf)![c](${CDN_ASSETS}/c.png)`
);
assert.equal(
  rewritten(`[![foto](${CDN_ASSETS}/a.jpg)](${CDN_ASSETS}/a.pdf)`),
  `[![foto](${CDN_ASSETS}/a.jpg)](${SITE}/a.pdf)`
);
assert.equal(rewritten(`${CDN_ASSETS}/scan.jpg%20kopie.pdf`), `${SITE}/scan.jpg%20kopie.pdf`);
assert.equal(
  rewriteRedirects(
    [
      `/aktualne/a/a.pdf ${CDN_ASSETS}/aktualne/a/a.pdf 301`,
      `/aktualne/a/č.pdf ${CDN_ASSETS}/aktualne/a/%C4%8D.pdf 301`,
      `/media/* ${CDN_ASSETS}/media/:splat 301`,
      `/zpravodaj/:slug/:file ${CDN_ASSETS}/zpravodaj/:slug/:file 301`,
      `/stary-letak.pdf ${CDN_ASSETS}/letaky/a/a.pdf 301`,
      '/kontakty/ /kontakt/ 301',
    ].join('\n')
  ),
  '/stary-letak.pdf /letaky/a/a.pdf 301\n/kontakty/ /kontakt/ 301'
);

assert(!readFileSync('dist/_redirects', 'utf8').includes(CDN_ASSETS), 'dist/_redirects still redirects to the CDN');
let outputs = 0;
let onSite = 0;
let onCdn = 0;
for (const entry of readdirSync('dist', { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !/\.(?:html|md|xml|json)$/.test(entry.name)) continue;
  const file = join(entry.parentPath, entry.name);
  const text = readFileSync(file, 'utf8');
  assert.equal(rewritten(text), text, `${file} was written after the links were rewritten`);
  outputs++;
  if (!entry.name.endsWith('.html')) continue;
  onSite += text.match(/<a [^>]*href="\/[^"]+\.(?:pdf|docx?|odt)"/gi)?.length ?? 0;
  onCdn += text.split(`href="${CDN_ASSETS}`).length - 1;
}
// A build that links to no document at all did not go through the rewrite.
assert(onSite > 1000, `Only ${onSite} documents are linked on the site`);
console.log(`Verified ${outputs} outputs: ${onSite} document links on the site, ${onCdn} links left on the CDN.`);
