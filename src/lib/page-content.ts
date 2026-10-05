import * as page0 from '../components/page-content/kontakt/index.astro';
import * as page1 from '../components/page-content/kontakt-en/index.astro';
import * as page2 from '../components/page-content/nas-pribeh/jak_jsme_rostli.astro';
import * as page3 from '../components/page-content/o-nas/deputy.astro';
import * as page4 from '../components/page-content/o-nas/historie.astro';
import * as page5 from '../components/page-content/o-nas/ombudsman.astro';
import * as page6 from '../components/page-content/o-nas/predpisy.astro';
import * as page7 from '../components/page-content/o-nas-en/deputy.astro';
import * as page8 from '../components/page-content/o-nas-en/historie.astro';
import * as page9 from '../components/page-content/o-nas-en/ombudsman.astro';
import * as page10 from '../components/page-content/o-nas-en/predpisy.astro';
import * as page11 from '../components/page-content/potrebuji-pomoc/diskriminace.astro';
import * as page12 from '../components/page-content/potrebuji-pomoc/dite.astro';
import * as page13 from '../components/page-content/potrebuji-pomoc/nevite-si-rady.astro';
import * as page14 from '../components/page-content/potrebuji-pomoc/omezeni-na-svobode.astro';
import * as page15 from '../components/page-content/potrebuji-pomoc/postizeni.astro';
import * as page16 from '../components/page-content/potrebuji-pomoc/problem-s-uradem.astro';
import * as page17 from '../components/page-content/potrebuji-pomoc-en/diskriminace.astro';
import * as page18 from '../components/page-content/potrebuji-pomoc-en/nevite-si-rady.astro';
import * as page19 from '../components/page-content/potrebuji-pomoc-en/omezeni-na-svobode.astro';
import * as page20 from '../components/page-content/potrebuji-pomoc-en/postizeni.astro';
import * as page21 from '../components/page-content/potrebuji-pomoc-en/problem-s-uradem.astro';
import * as page22 from '../components/page-content/pro-media/index.astro';
import * as page23 from '../components/page-content/section-pages/aktualne.astro';
import * as page24 from '../components/page-content/section-pages/dokument.astro';
import * as page25 from '../components/page-content/section-pages/eso.astro';
import * as page26 from '../components/page-content/section-pages/info.astro';
import * as page27 from '../components/page-content/section-pages/nas-pribeh.astro';
import * as page28 from '../components/page-content/section-pages/o-nas.astro';
import * as page29 from '../components/page-content/section-pages/potrebuji-pomoc.astro';
import * as page30 from '../components/page-content/section-pages/pristupnost.astro';
import * as page31 from '../components/page-content/section-pages/projekty.astro';
import * as page32 from '../components/page-content/section-pages/provoz.astro';
import * as page33 from '../components/page-content/section-pages/situace.astro';
import * as page34 from '../components/page-content/section-pages/srozumitelne.astro';
import * as page35 from '../components/page-content/section-pages/umluva.astro';
import * as page36 from '../components/page-content/section-pages/vystupy.astro';
import * as page37 from '../components/page-content/section-pages/vzdelavaci-akce.astro';
import * as page38 from '../components/page-content/section-pages/zpravodaj.astro';
import * as page39 from '../components/page-content/section-pages-en/aktualne.astro';
import * as page40 from '../components/page-content/section-pages-en/dokument.astro';
import * as page41 from '../components/page-content/section-pages-en/info.astro';
import * as page42 from '../components/page-content/section-pages-en/o-nas.astro';
import * as page43 from '../components/page-content/section-pages-en/potrebuji-pomoc.astro';
import * as page44 from '../components/page-content/section-pages-en/pristupnost.astro';
import * as page45 from '../components/page-content/section-pages-en/projekty.astro';
import * as page46 from '../components/page-content/section-pages-en/provoz.astro';
import * as page47 from '../components/page-content/section-pages-en/situace.astro';
import * as page48 from '../components/page-content/section-pages-en/vystupy.astro';
import * as page49 from '../components/page-content/podejte-stiznost/braille.astro';
import * as page50 from '../components/page-content/podejte-stiznost/czj.astro';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

type PageModule = { default: AstroComponentFactory; data: Record<string, any> };
export interface PageEntry {
  id: string;
  data: PageModule['data'];
  Content: AstroComponentFactory;
}

// Ordinary page copy lives in Astro source, where Nua can edit text and images
// directly. It is deliberately not registered as an Astro or CMS collection.
// Explicit ESM imports work in both Astro/Vite and the hosted Pletivo runtime.
const modules: Record<string, PageModule> = {
  '../components/page-content/kontakt/index.astro': page0,
  '../components/page-content/kontakt-en/index.astro': page1,
  '../components/page-content/nas-pribeh/jak_jsme_rostli.astro': page2,
  '../components/page-content/o-nas/deputy.astro': page3,
  '../components/page-content/o-nas/historie.astro': page4,
  '../components/page-content/o-nas/ombudsman.astro': page5,
  '../components/page-content/o-nas/predpisy.astro': page6,
  '../components/page-content/o-nas-en/deputy.astro': page7,
  '../components/page-content/o-nas-en/historie.astro': page8,
  '../components/page-content/o-nas-en/ombudsman.astro': page9,
  '../components/page-content/o-nas-en/predpisy.astro': page10,
  '../components/page-content/potrebuji-pomoc/diskriminace.astro': page11,
  '../components/page-content/potrebuji-pomoc/dite.astro': page12,
  '../components/page-content/potrebuji-pomoc/nevite-si-rady.astro': page13,
  '../components/page-content/potrebuji-pomoc/omezeni-na-svobode.astro': page14,
  '../components/page-content/potrebuji-pomoc/postizeni.astro': page15,
  '../components/page-content/potrebuji-pomoc/problem-s-uradem.astro': page16,
  '../components/page-content/potrebuji-pomoc-en/diskriminace.astro': page17,
  '../components/page-content/potrebuji-pomoc-en/nevite-si-rady.astro': page18,
  '../components/page-content/potrebuji-pomoc-en/omezeni-na-svobode.astro': page19,
  '../components/page-content/potrebuji-pomoc-en/postizeni.astro': page20,
  '../components/page-content/potrebuji-pomoc-en/problem-s-uradem.astro': page21,
  '../components/page-content/pro-media/index.astro': page22,
  '../components/page-content/section-pages/aktualne.astro': page23,
  '../components/page-content/section-pages/dokument.astro': page24,
  '../components/page-content/section-pages/eso.astro': page25,
  '../components/page-content/section-pages/info.astro': page26,
  '../components/page-content/section-pages/nas-pribeh.astro': page27,
  '../components/page-content/section-pages/o-nas.astro': page28,
  '../components/page-content/section-pages/potrebuji-pomoc.astro': page29,
  '../components/page-content/section-pages/pristupnost.astro': page30,
  '../components/page-content/section-pages/projekty.astro': page31,
  '../components/page-content/section-pages/provoz.astro': page32,
  '../components/page-content/section-pages/situace.astro': page33,
  '../components/page-content/section-pages/srozumitelne.astro': page34,
  '../components/page-content/section-pages/umluva.astro': page35,
  '../components/page-content/section-pages/vystupy.astro': page36,
  '../components/page-content/section-pages/vzdelavaci-akce.astro': page37,
  '../components/page-content/section-pages/zpravodaj.astro': page38,
  '../components/page-content/section-pages-en/aktualne.astro': page39,
  '../components/page-content/section-pages-en/dokument.astro': page40,
  '../components/page-content/section-pages-en/info.astro': page41,
  '../components/page-content/section-pages-en/o-nas.astro': page42,
  '../components/page-content/section-pages-en/potrebuji-pomoc.astro': page43,
  '../components/page-content/section-pages-en/pristupnost.astro': page44,
  '../components/page-content/section-pages-en/projekty.astro': page45,
  '../components/page-content/section-pages-en/provoz.astro': page46,
  '../components/page-content/section-pages-en/situace.astro': page47,
  '../components/page-content/section-pages-en/vystupy.astro': page48,
  '../components/page-content/podejte-stiznost/braille.astro': page49,
  '../components/page-content/podejte-stiznost/czj.astro': page50,
};

export async function getPageEntries(group: string): Promise<PageEntry[]> {
  const prefix = `../components/page-content/${group}/`;
  return Object.entries(modules)
    .filter(([file]) => file.startsWith(prefix))
    .map(([file, module]) => ({
      id: file.slice(prefix.length).replace(/\.astro$/, ''),
      data: module.data,
      Content: module.default,
    }));
}

export async function getPageEntry(group: string, id: string): Promise<PageEntry> {
  const page = (await getPageEntries(group)).find(page => page.id === id);
  if (!page) throw new Error(`Missing page source: ${group}/${id}`);
  return page;
}
