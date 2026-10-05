import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { stat, utimes } from 'node:fs/promises';

// Hosted Nua renders with Pletivo, not Vite. A static Astro build cannot detect
// unsupported runtime imports. Pletivo can return an error page with HTTP 200.
const probe = createServer();
await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = (probe.address() as { port: number }).port;
await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
const server = Bun.spawn(['bunx', 'pletivo@0.1.35', 'dev', `--port=${port}`, '--host=127.0.0.1', '--no-restart'], {
  stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' },
});
let logs = '';
async function collect(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  for await (const chunk of stream) logs += decoder.decode(chunk, { stream: true });
}
const readers = [collect(server.stdout), collect(server.stderr)];
const pages = [
  ['/', 'Veřejný ochránce práv'], ['/en/', 'Public Defender of Rights'],
  ['/pro-media/', 'Pro média'], ['/kontakt/', 'Jsme tu pro vás'],
  ['/o-nas/', 'O ombudsmanovi'], ['/newsletter/', 'Zpravodaj ombudsmana'],
  ['/hledat/', 'Hledání'], ['/en/hledat/', 'Search'],
  ['/vyzkumy-vse/', 'Výzkumy'], ['/zpravodaj-vse/', 'Zpravodaj ombudsmana'],
  ['/pristupnost/budova/', 'Bezbariérový přístup'],
  ['/umluva/clanek-01-ucel/', 'Článek 1: Účel'],
  ['/srozumitelne/cesky_vystizny_vyraz_pouzijte_pred_cizim/', 'Český výstižný výraz'],
  ['/vzdelavaci-akce/aktualni-problemy-vezenstvi/', 'Aktuální problémy vězeňství'],
  ['/situace/ombudsman-a-jeho-pravomoce/', 'Ombudsman a jeho pravomoci'],
  ['/vystupy/vyzkumy/', 'Výzkumy'],
  ['/podejte-stiznost/main/', 'Podejte'],
  ['/podejte-stiznost/braille/', 'Podejte stížnost v braillově písmu'],
  ['/podejte-stiznost/czj/', 'Podejte stížnost v českém znakovém jazyce'],
  ['/en/podejte-stiznost/', 'Submit a complaint'],
  ['/en/provoz/gdpr-a-ochrana-osobnich-udaju/', 'GDPR and personal data protection'],
  ['/dokument/prihlaseni_k_odberu_zpravodaje_ombudsmana/', 'Přihlášení k odběru'],
];
async function check([path, title]: string[]) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(30_000) });
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1].includes(title), `${path}: real page title missing`);
  assert.match(html, /<main[\s>]/, `${path}: main content missing`);
  assert.doesNotMatch(html, /ReferenceError:|TypeError:|Cannot access 'default' before initialization/, path);
  if (path === '/vystupy/vyzkumy/') {
    const years = [...html.matchAll(/id="research-(\d{4}|undated)"/g)].map(match => match[1]);
    assert.ok(years.length > 1, 'Research year view must contain separate year groups, not the generic flat list');
    assert.equal(new Set(years).size, years.length, 'Research year groups must be unique');
    const datedYears = years.filter(year => year !== 'undated').map(Number);
    assert.deepEqual(datedYears, [...datedYears].sort((a, b) => b - a), 'Research years must be newest first');
    if (years.includes('undated')) assert.equal(years.at(-1), 'undated', 'Undated research must be last');
    assert.match(html, /href="\/vystupy\/vyzkumy\/"[^>]*aria-current="page"/, 'Year tab must be active');
    assert.match(html, /href="\/vyzkumy-vse\/"/, 'Year view must link back to all research');
  }
  if (path === '/vyzkumy-vse/') {
    assert.match(html, /href="\/vyzkumy-vse\/"[^>]*aria-current="page"/, 'All-research tab must be active');
    assert.match(html, /href="\/vystupy\/vyzkumy\/"/, 'All research must link to the grouped year view');
  }
  if (path === '/pristupnost/budova/') assert.match(html, /kvop-01\.JPG/, 'preserved gallery photo');
}
try {
  const deadline = Date.now() + 90_000;
  while (!logs.includes('dev server running')) {
    assert.ok(Date.now() < deadline && server.exitCode === null, 'Pletivo failed to start');
    await Bun.sleep(100);
  }
  // Open collection previews on a cold runtime before any homepage request.
  await Promise.all([pages[15], pages[17], pages[18], pages[19]].map(check));
  // Cold, concurrent and warm requests exercise module initialization separately.
  await check(pages[0]);
  for (let i = 0; i < pages.length; i += 5) await Promise.all(pages.slice(i, i + 5).map(check));
  await check(pages[0]);
  // Trigger the source watcher without altering source content.
  const source = 'src/pages/index.astro';
  const original = await stat(source);
  try {
    await utimes(source, original.atime, new Date());
    await Bun.sleep(800);
    await Promise.all(pages.slice(0, 4).map(check));
  } finally {
    await utimes(source, original.atime, original.mtime);
  }
  assert.doesNotMatch(logs, /Error rendering|ReferenceError:|TypeError:/, 'Pletivo runtime errors');
  console.log(`Verified ${pages.length} Pletivo preview routes, repeated requests and source reload.`);
} catch (error) {
  console.error(logs.slice(-12_000));
  throw error;
} finally {
  server.kill();
  await server.exited;
  await Promise.all(readers);
}
