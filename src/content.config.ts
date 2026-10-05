import { reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCmsCollection, n } from '@nuasite/cms';

// --- id helpers ---
const indexEntryId = ({ entry }: { entry: string; data: Record<string, unknown> }) =>
  entry.replace(/\/index\.(json|ya?ml|md)$/, '').replace(/\.(json|ya?ml|md)$/, '');

// Collections represent repeatable editorial data. Ordinary page copy lives
// in src/components/page-content and uses Nua's live text/image editor.
// Bodies use the rich editor. Metadata leads use textarea: the hosted dashboard
// does not currently expose metadata fields of type markdown.
const BUNDLE = '*.{yaml,yml,json}';
const RICH_CONTENT = '*.md';
const SINGLE = 'index.{yaml,yml,json}';

/**
 * Empty CMS write. When an editor clears a boolean/number field (or creates a new
 * record) the CMS writes `""` into the frontmatter, which a `z.boolean()`/`z.number()`
 * schema rejects and the build dies on. Chained as `.optional().or(blank)` an empty
 * string is read as "no value": the resulting type stays `T | undefined`, exactly what
 * `.optional()` already produced, so no consumer sees a new shape.
 */
const blank = z.literal('').transform(() => undefined);

// --- reusable sub-object schemas (allowed inside z.array) ---
const linkItem = z.object({
  link: n.url({ label: 'Cíl odkazu' }).optional(),
  text: n.text({ label: 'Text odkazu' }).optional(),
});
const linkItemEn = z.object({
  link: n.url({ label: 'Link URL' }).optional(),
  text: n.text({ label: 'Link text' }).optional(),
});

/**
 * Repeater of single-value items. `n.array(n.string())` degrades in the CMS to one
 * text input with the items comma-separated — unaddable, undeletable. An array of
 * objects gets a real repeater with "+ Add" and a remove button per row. The
 * matching `textList` transform unwraps the rows back into the plain
 * `string[]` every template already reads, so no consumer sees a new shape.
 */
const textItem = z.object({ text: n.text({ label: "Text" }).optional() });
const textList = (items?: z.infer<typeof textItem>[]) =>
  items?.map((item) => item.text).filter((value): value is string => !!value);
const referenceIds = (items?: { id: string }[]) => items?.map((item) => item.id);
const referenceId = (item: { id: string }) => item.id;

// `provoz` contact page blocks. Spelled out as objects (they used to be
// `z.record(z.string(), z.any())`) so the CMS renders a repeater instead of a text input.
const provozSection = z.object({
  title: n.text({ label: 'Nadpis' }).optional(),
  intro: n.textarea({ label: 'Text' }).optional(),
});

export const collections = {
  homepage: defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/homepage', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      claim: n.text({ label: 'Hlavní motto' }),
      headerPic: n.image({ label: 'Úvodní fotografie' }),
      headerPicAlt: n.textarea({ label: 'Popis fotografie' }).optional(),
      situationsTitle: n.text({ label: 'Nadpis pomoci' }),
      cinnostTitle: n.text({ label: 'Nadpis činnosti' }).optional(),
      activities: n.array(z.object({
        href: n.url({ label: 'Cíl odkazu' }),
        icon: n.text({ label: 'Ikona' }),
        title: n.text({ label: 'Nadpis' }),
        hp: n.textarea({ label: 'Perex pod nadpisem' }),
      }), { label: 'Aktivity' }).optional(),
    }),
    cms: { pathname: [{ literal: '/' }] },
  }),
  'homepage-en': defineCmsCollection({
    loader: glob({ pattern: SINGLE, base: './src/content/homepage-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      claim: n.text({ label: 'Main claim' }),
      headerPic: n.image({ label: 'Hero image' }),
      headerPicAlt: n.textarea({ label: 'Image description' }).optional(),
      situationsTitle: n.text({ label: 'Help section heading' }),
      cinnostTitle: n.text({ label: 'Activities heading' }).optional(),
      activities: n.array(z.object({
        href: n.url({ label: 'Link URL' }),
        icon: n.text({ label: 'Icon' }),
        title: n.text({ label: 'Heading' }),
        hp: n.textarea({ label: 'Lead under heading' }),
      }), { label: 'Activities' }).optional(),
    }),
    cms: { pathname: [{ literal: 'en' }] },
  }),

  // ===================== NEWS / DOCUMENTS / LEAFLETS =====================
  aktualne: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/aktualne', generateId: indexEntryId }),
    schema: n.object({
      title: n.text({ label: 'Název', help: 'Titulek aktuality zobrazený na webu.' }),
      date: n.date({ label: 'Datum publikace', sidebar: true }).orderBy('desc').nullable().optional(),
      perex: n.textarea({ label: 'Perex', help: 'Krátké úvodní shrnutí. Pro odkazy nebo zvýraznění můžete použít Markdown.' }).optional(),
      kategorie: n.array(reference('vystupy'), { label: "Kategorie" }).optional().transform(referenceIds),
      obrazek: n.image({ label: 'Úvodní obrázek', sidebar: true }).optional(),
      draft: n.boolean({ label: "Koncept" }).optional().or(blank),
    }),
    cms: {
      pathname: [{ literal: 'aktualne' }, { field: 'slug' }],
      sidebar: ['date', 'obrazek', 'draft'],
      sections: [
        { title: 'Základní údaje', fields: ['title', 'perex', 'kategorie'] },
      ],
    },
  }),
  'aktualne-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/aktualne-en', generateId: indexEntryId }),
    schema: n.object({
      title: n.text({ label: 'Title' }),
      date: n.date({ label: 'Publication date' }).orderBy('desc').nullable().optional(),
      perex: n.textarea({ label: 'Lead', help: 'Short introduction. Markdown links and emphasis are supported.' }).optional(),
      categories: n.array(reference('vystupy-en'), { label: 'Categories' }).optional().transform(referenceIds),
      illustration: n.image({ label: 'Lead image', sidebar: true }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'en' }, { literal: 'aktualne' }, { field: 'slug' }],
      sidebar: ['date', 'illustration'],
      sections: [
        { title: 'Basic information', fields: ['title', 'perex', 'categories'] },
      ],
    },
  }),
  dokument: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/dokument', generateId: indexEntryId }),
    schema: n.object({
      title: n.text({ label: 'Název' }),
      date: n.date({ label: 'Datum publikace' }).orderBy('desc').nullable().optional(),
      perex: n.textarea({ label: 'Perex' }).optional(),
      vystupy: n.array(reference('vystupy'), { label: 'Kategorie výstupů', help: 'Vyberte existující kategorie. Novou přidejte v kolekci Kategorie výstupů.' }).optional().transform(referenceIds),
      organ: n.enum(['CEDAW', 'OHCHR'], { label: 'Mezinárodní orgán', help: 'Pouze pro vyjádření pro mezinárodní orgány.' }).optional(),
      file: n.file({ label: 'Soubor pro tlačítko Stáhnout dokument', help: 'Volitelný soubor se zobrazí jako samostatné tlačítko pod textem. Ostatní odkazy na soubory vložte přímo do textu dokumentu.' }).optional(),
      draft: n.boolean({ label: "Koncept" }).optional().or(blank),
    }),
    cms: { pathname: [{ literal: 'dokument' }, { field: 'slug' }] },
  }),
  'dokument-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/dokument-en', generateId: indexEntryId }),
    schema: n.object({
      title: n.text({ label: 'Title' }),
      date: n.date({ label: 'Publication date' }).orderBy('desc').nullable().optional(),
      perex: n.textarea({ label: 'Lead' }).optional(),
      vystupy: n.array(reference('vystupy-en'), { label: 'Output categories', help: 'Select existing categories. Add a new one in the Output categories collection.' }).optional().transform(referenceIds),
      file: n.file({ label: 'File for the Download document button', help: 'Optional file shown as a separate button below the text. Insert other file links directly into the document text.' }).optional(),
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'dokument' }, { field: 'slug' }] },
  }),
  letaky: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/letaky', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      situace: n.array(reference('situace'), { label: 'Situace', help: 'Vyberte jednu nebo více existujících situací.' }).optional().transform(referenceIds),
      file: n.file({ label: 'Hlavní leták ke stažení' }).optional(),
      seeing: n.file({ label: 'Verze pro osoby se zrakovým postižením', help: 'Volitelná přístupná verze zobrazená pod hlavním letákem.' }).optional(),
      roma: n.file({ label: 'Romská jazyková verze', help: 'Volitelná romská verze zobrazená pod hlavním letákem.' }).optional(),
      kids: n.file({ label: 'Dětská verze', help: 'Volitelná dětská verze zobrazená pod hlavním letákem.' }).optional(),
      draft: n.boolean({ label: "Koncept" }).optional().or(blank),
    }),
    cms: { pathname: [{ literal: 'letaky' }, { field: 'slug' }] },
  }),
  'letaky-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/letaky-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      situace: n.array(reference('situace-en'), { label: 'Situations', help: 'Select one or more existing situations.' }).optional().transform(referenceIds),
      file: n.file({ label: 'Main leaflet download' }).optional(),
      seeing: n.file({ label: 'Accessible version for people with visual impairments', help: 'Optional accessible version shown below the main leaflet.' }).optional(),
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'letaky' }, { field: 'slug' }] },
  }),

  // The detail copy remains editable directly in the page preview. These data
  // records make the pages discoverable as a collection and drive their cards.
  'potrebuji-pomoc': defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/potrebuji-pomoc', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      perex: n.textarea({ label: 'Perex' }).optional(),
      hp: n.textarea({ label: 'Text na homepage' }).optional(),
      order: n.number({ label: 'Pořadí' }).optional().or(blank),
      link: n.url({ label: 'Vlastní cíl odkazu' }).optional(),
      icon: n.text({ label: 'Ikona na homepage' }).optional(),
    }),
    cms: { pathname: [{ literal: 'potrebuji-pomoc' }, { field: 'slug' }] },
  }),
  'potrebuji-pomoc-en': defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/potrebuji-pomoc-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      perex: n.textarea({ label: 'Lead' }).optional(),
      hp: n.textarea({ label: 'Homepage text' }).optional(),
      order: n.number({ label: 'Order' }).optional().or(blank),
      link: n.url({ label: 'Custom link target' }).optional(),
      icon: n.text({ label: 'Homepage icon' }).optional(),
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'potrebuji-pomoc' }, { field: 'slug' }] },
  }),

  // ===================== EVENTS / NEWSLETTER / ESO =====================
  'vzdelavaci-akce': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/vzdelavaci-akce', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      startDate: n.date({ label: "Datum začátku" }).nullable().optional(),
      perex: n.textarea({ label: "Perex" }).optional(),
    }),
    cms: { pathname: [{ literal: 'vzdelavaci-akce' }, { field: 'slug' }] },
  }),
  zpravodaj: defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/zpravodaj', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      month: n.number({ label: "Měsíc" }).optional().or(blank),
      year: n.number({ label: "Rok" }).optional().or(blank),
      author: n.text({ label: "Autor" }).optional(),
      perex: n.textarea({ label: "Perex" }).optional(),
      file: n.file({ label: "Soubor" }).optional(),
    }),
    cms: { pathname: [{ literal: 'zpravodaj' }, { field: 'slug' }] },
  }),
  'zpravodaj-articles': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/zpravodaj-articles', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      parent: reference('zpravodaj').transform(referenceId),
      section: n.text({ label: 'Rubrika', help: 'Nadpis skupiny článků ve vydání.' }).optional(),
      id: n.text({ label: 'Spisová značka' }).optional(),
      eso: n.url({ label: 'Odkaz do ESO' }).optional(),
      order: n.number({ label: 'Pořadí ve vydání', help: 'Určuje pořadí článků i jejich odkaz v obsahu.' }),
    }),
    cms: {
      pathname: [{ literal: 'zpravodaj' }, { literal: 'clanky' }, { field: 'slug' }],
      sections: [
        { title: 'Vydání zpravodaje — vyberte existující', fields: ['parent', 'order', 'section'] },
        { title: 'Článek', fields: ['title', 'id', 'eso'] },
      ],
    },
  }),
  eso: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/eso', generateId: indexEntryId }),
    schema: n.object({
      title: n.text({ label: 'Název' }),
      date: n.date({ label: 'Datum publikace', help: 'Datum pro řazení záznamů v redakci; starší tematické stránky datum nemají.' }).orderBy('desc').nullable().optional(),
      rank: n.number({ label: "Pořadí na stránce" }).optional().or(blank),
      illustration: n.image({ label: "Ilustrace" }).optional(),
      perex: n.textarea({ label: 'Perex' }).optional(),
      eso: n.array(z.object({ title: n.text({ label: "Název" }).optional() }), { label: "Stanoviska ESO" }).optional(),
    }),
    cms: { pathname: [{ literal: 'eso' }, { field: 'slug' }] },
  }),

  // ===================== ABOUT / SCOPE / HELP =====================
  pusobnost: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/pusobnost', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      weight: n.number({ label: "Váha pořadí" }).optional().or(blank),
      draft: n.boolean({ label: "Koncept" }).optional().or(blank),
      headerColor: n.text({ label: "Barva hlavičky" }).nullable().optional(),
      illustration: n.image({ label: "Ilustrace" }).optional(),
      perex: n.textarea({ label: "Perex" }).optional(),
      cta: z.object({ title: n.text({ label: "Název" }).optional(), btnLink: n.url({ label: "Cíl tlačítka" }).optional() }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'pusobnost' }, { field: 'slug' }],
      sidebar: ['headerColor', 'illustration', 'perex', 'cta', 'draft'],
      sections: [{ title: 'Stránka', fields: ['title'] }],
    },
  }),
  'pusobnost-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/pusobnost-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      draft: n.boolean({ label: "Draft" }).optional().or(blank),
      headerColor: n.text({ label: "Header color" }).nullable().optional(),
      illustration: n.image({ label: "Image" }).optional(),
      perex: n.textarea({ label: "Lead" }).optional(),
      cta: z.object({ title: n.text({ label: "Title" }).optional(), btnLink: n.url({ label: "Button URL" }).optional() }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'en' }, { literal: 'pusobnost' }, { field: 'slug' }],
      sidebar: ['headerColor', 'illustration', 'perex', 'cta', 'draft'],
      sections: [{ title: 'Page', fields: ['title'] }],
    },
  }),
  projekty: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/projekty', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      draft: n.boolean({ label: 'Koncept' }).optional().or(blank),
      ongoing: n.boolean({ label: 'Probíhající projekt' }).optional().or(blank),
    }),
    cms: {
      pathname: [{ literal: 'projekty' }, { field: 'slug' }],
      sidebar: ['draft', 'ongoing'],
      sections: [
        { title: 'Projekt', fields: ['title'] },
      ],
    },
  }),
  'projekty-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/projekty-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      ongoing: n.boolean({ label: 'Ongoing project' }).optional().or(blank),
    }),
    cms: {
      pathname: [{ literal: 'en' }, { literal: 'projekty' }, { field: 'slug' }],
      sidebar: ['ongoing'],
      sections: [
        { title: 'Project', fields: ['title'] },
      ],
    },
  }),

  // ===================== ACCESSIBILITY / INFO / OPERATIONS =====================
  pristupnost: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/pristupnost', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      perex: n.textarea({ label: "Perex" }).optional(),
      // No `hidePages`/`includeInSearchIndex` here: the section index reads those two
      // straight from the Hugo source (`content/pristupnost/_index.md`, see
      // pages/pristupnost/index.astro), never from this collection. Declared but never
      // stored, they would reach the CMS as text inputs and a typed string would break the build.
      chapters: n.array(z.object({ title: n.text({ label: "Název" }).optional(), link: n.url({ label: "Cíl odkazu" }).optional() }), { label: "Kapitoly" }).optional(),
    }),
    cms: { pathname: [{ literal: 'pristupnost' }, { field: 'slug' }] },
  }),
  'pristupnost-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/pristupnost-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'pristupnost' }, { field: 'slug' }] },
  }),
  info: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/info', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      draft: n.boolean({ label: "Koncept" }).optional().or(blank),
      order: n.number({ label: "Pořadí" }).optional().or(blank),
      hp: n.textarea({ label: "Text na homepage" }).optional(),
      illustration: n.image({ label: "Ilustrace" }).optional(),
      links: n.array(linkItem, { label: "Odkazy" }).optional(),
    }),
    cms: { pathname: [{ literal: 'info' }, { field: 'slug' }] },
  }),
  'info-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/info-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      draft: n.boolean({ label: "Draft" }).optional().or(blank),
      order: n.number({ label: "Order" }).optional().or(blank),
      hp: n.textarea({ label: "Homepage lead" }).optional(),
      illustration: n.image({ label: "Image" }).optional(),
      links: n.array(linkItemEn, { label: "Links" }).optional(),
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'info' }, { field: 'slug' }] },
  }),
  info106: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/info106', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
    }),
    cms: { pathname: [{ literal: 'info106' }, { field: 'slug' }] },
  }),
  provoz: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/provoz', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      draft: n.boolean({ label: "Koncept" }).optional().or(blank),
      links: n.array(linkItem, { label: "Odkazy" }).optional(),
      linksAfter: n.array(linkItem, { label: "Odkazy za textem" }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'provoz' }, { field: 'slug' }],
      sidebar: ['draft'],
      sections: [
        { title: 'Stránka', fields: ['title'] },
        { title: 'Odkazy před hlavním textem', fields: ['links'], collapsed: true },
        { title: 'Odkazy za hlavním textem', fields: ['linksAfter'], collapsed: true },
      ],
    },
  }),
  'provoz-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/provoz-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      draft: n.boolean({ label: "Draft" }).optional().or(blank),
      links: n.array(linkItemEn, { label: "Links" }).optional(),
      linksAfter: n.array(linkItemEn, { label: "Links after text" }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'en' }, { literal: 'provoz' }, { field: 'slug' }],
      sidebar: ['draft'],
      sections: [
        { title: 'Page', fields: ['title'] },
        { title: 'Links before content', fields: ['links'], collapsed: true },
        { title: 'Links after content', fields: ['linksAfter'], collapsed: true },
      ],
    },
  }),
  lide: defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/lide', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace' }).nullable().optional(),
      title: n.text({ label: 'Jméno', help: 'Jméno, příjmení a případné tituly.' }),
      role: n.text({ label: 'Funkce a agenda' }).optional(),
      email: n.email({ label: 'E-mail' }).optional(),
      phone: n.tel({ label: 'Telefon' }).optional(),
      department: reference('oddeleni').transform(referenceId),
      departmentHead: n.boolean({ label: 'Vedoucí oddělení / odboru', help: 'Vedoucí se vždy zobrazí jako první ve svém oddělení bez ohledu na číselné pořadí.' }).default(false),
      visible: n.boolean({ label: 'Zobrazit na stránce Kontakty', help: 'Zapnuté zobrazí osobu na stránce Kontakty. Vypnuté ji skryje; údaje zůstanou uložené.' }).default(true),
      order: n.number({ label: 'Pořadí v oddělení', help: 'Vedoucí je vždy první. Ostatní lidé se řadí podle čísla od nejnižšího; bez čísla jsou na konci, podle jména.' }).optional().or(blank),
    }),
    cms: {
      pathname: [{ literal: 'provoz' }, { literal: 'lide' }, { field: 'slug' }],
      sections: [
        { title: 'Člověk', fields: ['title', 'role', 'email', 'phone'] },
        { title: 'Oddělení — vyberte existující; nové přidejte v kolekci Oddělení', fields: ['department', 'departmentHead', 'order'] },
        { title: 'Viditelnost na stránce Kontakty (vypnuté = skryté)', fields: ['visible'], collapsed: false },
      ],
    },
  }),
  oddeleni: defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/oddeleni', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      intro: n.textarea({ label: 'Popis oddělení', help: 'Agenda oddělení nebo společné kontaktní údaje. Jednotlivé lidi spravujte v kolekci Lidé.' }).optional(),
      order: n.number({ label: 'Pořadí oddělení', help: 'Nižší číslo se zobrazí výše na stránce Kontakty.' }).optional().or(blank),
    }),
    cms: { pathname: [{ literal: 'provoz' }, { literal: 'oddeleni' }, { field: 'slug' }] },
  }),
  'provoz-kontakty': defineCmsCollection({
    loader: glob({ pattern: SINGLE, base: './src/content/provoz-kontakty' }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      sections: n.array(provozSection, { label: 'Základní kontaktní bloky' }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'provoz' }, { literal: 'kontakty' }],
      sections: [
        { title: 'Základní kontakty', fields: ['title', 'sections'] },
      ],
    },
  }),

  // ===================== GUIDES (cs only) =====================
  srozumitelne: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/srozumitelne', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      num: n.number({ label: "Číslo" }).optional().or(blank),
    }),
    cms: { pathname: [{ literal: 'srozumitelne' }, { field: 'slug' }] },
  }),

  umluva: defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/umluva', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
    }),
    cms: { pathname: [{ literal: 'umluva' }, { field: 'slug' }] },
  }),

  // ===================== TAXONOMIES =====================
  situace: defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/situace', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      perex: n.textarea({ label: 'Perex' }).optional(),
      illustration: n.image({ label: "Ilustrace" }).optional(),
    }),
    cms: { pathname: [{ literal: 'situace' }, { field: 'slug' }] },
  }),
  'situace-en': defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/situace-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      perex: n.textarea({ label: 'Lead' }).optional(),
      illustration: n.image({ label: "Image" }).optional(),
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'situace' }, { field: 'slug' }] },
  }),
  vystupy: defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/vystupy', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      plural: n.text({ label: "Název v množném čísle" }).optional(),
      listed: n.boolean({ label: "Zobrazit v seznamu" }).optional().or(blank),
      perex: n.textarea({ label: "Perex" }).optional(),
      illustration: n.image({ label: "Ilustrace" }).optional(),
    }),
    cms: { pathname: [{ literal: 'vystupy' }, { field: 'slug' }] },
  }),
  'vystupy-en': defineCmsCollection({
    loader: glob({ pattern: BUNDLE, base: './src/content/vystupy-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      plural: n.text({ label: "Plural name" }).optional(),
      listed: n.boolean({ label: "Show in list" }).optional().or(blank),
      perex: n.textarea({ label: "Lead" }).optional(),
      illustration: n.image({ label: "Image" }).optional(),
      // No `media` here: unlike the Czech terms, no English one carries it and nothing
      // renders it — a boolean the CMS has never seen a value for degrades to a text input.
    }),
    cms: { pathname: [{ literal: 'en' }, { literal: 'vystupy' }, { field: 'slug' }] },
  }),

  // ===================== SINGLETONS / DATA PAGES =====================
  'podejte-stiznost': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/podejte-stiznost', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název' }),
      introIcon: n.image({ label: 'Ikona v úvodu' }).optional(),
      online: z.object({
        title: n.text({ label: 'Nadpis' }),
        icon: n.image({ label: 'Ikona' }).optional(),
        intro: n.textarea({ label: 'Úvodní věta' }),
        url: n.url({ label: 'Odkaz na portál' }),
        linkLabel: n.text({ label: 'Text odkazu' }),
        buttonLabel: n.text({ label: 'Text tlačítka' }),
      }).optional(),
      emailMethod: z.object({
        title: n.text({ label: 'Nadpis' }),
        icon: n.image({ label: 'Ikona' }).optional(),
        intro: n.textarea({ label: 'Pokyn' }),
        address: n.email({ label: 'E-mail podatelny' }),
      }).optional(),
      postMethod: z.object({
        title: n.text({ label: 'Nadpis' }),
        icon: n.image({ label: 'Ikona' }).optional(),
        intro: n.textarea({ label: 'Pokyn' }),
        address: n.textarea({ label: 'Poštovní adresa' }),
        helpLabel: n.text({ label: 'Text odkazu na nápovědu' }),
      }).optional(),
      inpersonMethod: z.object({
        title: n.text({ label: 'Nadpis' }),
        icon: n.image({ label: 'Ikona' }).optional(),
        intro: n.textarea({ label: 'Pokyn a úřední hodiny' }),
        address: n.textarea({ label: 'Adresa' }),
        note: n.textarea({ label: 'Poznámka' }),
      }).optional(),
      accessibility: z.object({
        title: n.text({ label: 'Nadpis' }),
        icon: n.image({ label: 'Ikona' }).optional(),
        intro: n.textarea({ label: 'Úvodní text' }),
        links: n.array(linkItem, { label: "Odkazy" }),
      }).optional(),
      email: n.array(z.object({ link: n.file({ label: 'Soubor' }).optional(), desc: n.text({ label: 'Popis souboru' }).optional() }), { label: 'Soubory k e-mailu' }).optional(),
      post: n.array(z.object({ link: n.file({ label: 'Soubor' }).optional(), desc: n.text({ label: 'Popis souboru' }).optional() }), { label: 'Soubory k poštovnímu podání' }).optional(),
      inperson: n.array(z.object({ link: n.file({ label: 'Soubor' }).optional(), desc: n.text({ label: 'Popis souboru' }).optional() }), { label: 'Soubory k osobnímu podání' }).optional(),
      submission: z.object({
        title: n.text({ label: "Název" }).optional(),
        icon: n.image({ label: 'Ikona' }).optional(),
        body: n.textarea({ label: "Hlavní text" }).optional(),
        'example-links': z.array(z.object({ link: n.file({ label: "Cíl odkazu" }).optional(), desc: n.text({ label: "Popis" }).optional() })).optional(),
      }).optional(),
      contact: z.object({
        title: n.text({ label: 'Nadpis kontaktního bloku' }).optional(),
        label: n.text({ label: 'Výzva ke kontaktu' }).optional(),
        phoneLabel: n.text({ label: 'Popisek telefonu' }).optional(),
        emailLabel: n.text({ label: 'Popisek e-mailu' }).optional(),
        name: n.text({ label: 'Jméno' }).optional(),
        email: n.email({ label: 'E-mail' }).optional(),
        phone: n.tel({ label: 'Telefon' }).optional(),
        pic: n.image({ label: 'Fotografie' }).optional(),
      }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'podejte-stiznost' }],
      sections: [
        { title: 'Úvod', fields: ['title'] },
        { title: 'Podání online', fields: ['online'] },
        { title: 'Podání e-mailem', fields: ['emailMethod', 'email'] },
        { title: 'Podání poštou', fields: ['postMethod', 'post'] },
        { title: 'Osobní podání', fields: ['inpersonMethod', 'inperson'] },
        { title: 'Další informace', fields: ['accessibility', 'submission', 'contact'], collapsed: true },
      ],
    },
  }),
  'podejte-stiznost-en': defineCmsCollection({
    loader: glob({ pattern: RICH_CONTENT, base: './src/content/podejte-stiznost-en', generateId: indexEntryId }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title' }),
      introIcon: n.image({ label: 'Introduction icon' }).optional(),
      online: z.object({
        title: n.text({ label: 'Heading' }),
        icon: n.image({ label: 'Icon' }).optional(),
        intro: n.textarea({ label: 'Introduction' }),
        url: n.url({ label: 'Portal URL' }),
        linkLabel: n.text({ label: 'Link text' }),
        buttonLabel: n.text({ label: 'Button text' }),
      }).optional(),
      emailMethod: z.object({
        title: n.text({ label: 'Heading' }),
        icon: n.image({ label: 'Icon' }).optional(),
        intro: n.textarea({ label: 'Instructions' }),
        address: n.email({ label: 'Registry e-mail' }),
      }).optional(),
      postMethod: z.object({
        title: n.text({ label: 'Heading' }),
        icon: n.image({ label: 'Icon' }).optional(),
        intro: n.textarea({ label: 'Instructions' }),
        address: n.textarea({ label: 'Postal address' }),
      }).optional(),
      inpersonMethod: z.object({
        title: n.text({ label: 'Heading' }),
        icon: n.image({ label: 'Icon' }).optional(),
        intro: n.textarea({ label: 'Instructions and office hours' }),
        address: n.textarea({ label: 'Address' }),
      }).optional(),
      email: n.array(z.object({ link: n.file({ label: 'File' }).optional(), desc: n.text({ label: 'File description' }).optional() }), { label: 'Email attachments' }).optional(),
      post: n.array(z.object({ link: n.file({ label: 'File' }).optional(), desc: n.text({ label: 'File description' }).optional() }), { label: 'Postal attachments' }).optional(),
      inperson: n.array(z.object({ link: n.file({ label: 'File' }).optional(), desc: n.text({ label: 'File description' }).optional() }), { label: 'In-person attachments' }).optional(),
      contact: z.object({
        title: n.text({ label: 'Contact block heading' }).optional(),
        label: n.text({ label: 'Contact prompt' }).optional(),
        phoneLabel: n.text({ label: 'Phone label' }).optional(),
        emailLabel: n.text({ label: 'Email label' }).optional(),
        name: n.text({ label: 'Name' }).optional(),
        email: n.email({ label: 'Email' }).optional(),
        phone: n.tel({ label: 'Phone' }).optional(),
        pic: n.image({ label: 'Photo' }).optional(),
      }).optional(),
    }),
    cms: {
      pathname: [{ literal: 'en' }, { literal: 'podejte-stiznost' }],
      sections: [
        { title: 'Introduction', fields: ['title'] },
        { title: 'Online submission', fields: ['online'] },
        { title: 'Email submission', fields: ['emailMethod', 'email'] },
        { title: 'Postal submission', fields: ['postMethod', 'post'] },
        { title: 'In-person submission', fields: ['inpersonMethod', 'inperson'] },
        { title: 'Contact', fields: ['contact'], collapsed: true },
      ],
    },
  }),
  alert: defineCmsCollection({
    loader: glob({ pattern: SINGLE, base: './src/content/alert' }),
    schema: n.object({
      date: n.date({ label: 'Datum publikace', help: 'Volitelné datum zveřejnění pro řazení záznamů. Neznámá historická data ponechte prázdná.' }).nullable().optional(),
      title: n.text({ label: 'Název', help: 'Krátký odkaz zobrazovaný nad hlavičkou na všech českých stránkách.' }).optional(),
      active: n.boolean({ label: 'Zobrazit lištu' }).optional().or(blank),
      prefix: n.text({ label: 'Krátký štítek' }).optional(),
      href: n.url({ label: 'Cíl odkazu' }).optional(),
    }),
    cms: { fragment: true, previewOf: '/' },
  }),
  'alert-en': defineCmsCollection({
    loader: glob({ pattern: SINGLE, base: './src/content/alert-en' }),
    schema: n.object({
      date: n.date({ label: 'Publication date', help: 'Optional publication date for sorting entries. Leave unknown historical dates empty.' }).nullable().optional(),
      title: n.text({ label: 'Title', help: 'Short link shown above the header on every English page.' }).optional(),
      active: n.boolean({ label: 'Show notice bar' }).optional().or(blank),
      prefix: n.text({ label: 'Short prefix' }).optional(),
      href: n.url({ label: 'Link URL' }).optional(),
    }),
    cms: { fragment: true, previewOf: '/en/' },
  }),

};
