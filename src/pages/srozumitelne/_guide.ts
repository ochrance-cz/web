import { getPageEntry } from '../../lib/page-content';
// Shared helpers for the "Jak psát srozumitelně" guide routes.
// Underscore-prefixed → not a route (Astro ignores it under src/pages).
//
// The authoritative chapter order is the `chapters:` table-of-contents list in
// the Nua-managed section page. It covers
// all 72 chapters in reading order, whereas the `num` field is only present on
// 57 of them — sorting by `num` alone would jam the 15 num-less chapters at the
// front. We sort by TOC position, with `num` then `title` as fallbacks.

import { renderMarkdown } from '../../lib/markdown';

let dataCache: Promise<Record<string, any>> | undefined;
function loadData(): Promise<Record<string, any>> {
  dataCache ??= getPageEntry('section-pages', 'srozumitelne').then((entry) => entry?.data ?? {});
  return dataCache;
}

export interface GuideIndex {
  title: string;
  subtitle: string;
  /** slug → position in the TOC */
  order: Map<string, number>;
}

let indexCache: Promise<GuideIndex> | undefined;
let twoColCache: Promise<Record<string, string>> | undefined;
let textContentCache: Promise<Record<string, string>> | undefined;

export function loadGuideIndex(): Promise<GuideIndex> {
  indexCache ??= (async () => {
    let title = 'Jak psát srozumitelně úřední texty';
    let subtitle = '';
    const order = new Map<string, number>();
    try {
      const fm = await loadData();
      if (typeof fm.title === 'string') title = fm.title;
      if (typeof fm.subtitle === 'string') subtitle = fm.subtitle;
      const chapters = Array.isArray(fm.chapters) ? (fm.chapters as Record<string, unknown>[]) : [];
      chapters.forEach((c, i) => {
        const slug = String(c.chapter ?? '').replace(/\/index$/, '');
        if (slug) order.set(slug, i);
      });
    } catch {
      /* fall back to defaults / empty order */
    }
    return { title, subtitle, order };
  })();
  return indexCache;
}

/** Sort guide chapter entries into reading order (TOC, then num, then title). */
export function sortChapters<T extends { id: string; data: { num?: number; title: string } }>(
  entries: T[],
  order: Map<string, number>,
): T[] {
  const pos = (e: T) => order.get(e.id) ?? Number.MAX_SAFE_INTEGER;
  return [...entries].sort((a, b) => {
    const d = pos(a) - pos(b);
    if (d !== 0) return d;
    const dn = (a.data.num ?? Number.MAX_SAFE_INTEGER) - (b.data.num ?? Number.MAX_SAFE_INTEGER);
    return dn !== 0 ? dn : a.data.title.localeCompare(b.data.title, 'cs');
  });
}

/**
 * Build slug → rendered-HTML map from the `textcontent[]` params in
 * the section page (mirrors layouts/srozumitelne/list.html: each block is markdown
 * inserted *before* the chapter named in `before`). Used to interleave section
 * headings/intros into the guide table of contents.
 */
export function loadTextContent(): Promise<Record<string, string>> {
  textContentCache ??= (async () => {
    const map: Record<string, string> = {};
    try {
      const fm = await loadData();
      const blocks = Array.isArray(fm.textcontent) ? (fm.textcontent as Record<string, unknown>[]) : [];
      for (const block of blocks) {
        const slug = String(block.before ?? '').replace(/\/index$/, '');
        if (!slug) continue;
        map[slug] = await renderMarkdown(String(block.text ?? ''));
      }
    } catch {
      /* leave map empty; TOC renders without interleaved headings */
    }
    return map;
  })();
  return textContentCache;
}

/**
 * Build id → `<dl>` two-column comparison HTML from the `twocols[]` params in
 * the section page (mirrors layouts/shortcodes/sloupce.html: left=dt, right=dd,
 * both via markdownify). Used to fill `<!-- sloupce:ID -->` body markers.
 */
export function loadTwoColMap(): Promise<Record<string, string>> {
  twoColCache ??= (async () => {
    const map: Record<string, string> = {};
    try {
      const fm = await loadData();
      const twocols = Array.isArray(fm.twocols) ? (fm.twocols as Record<string, unknown>[]) : [];
      for (const col of twocols) {
        const id = String(col.id ?? '');
        if (!id) continue;
        const type = String(col.type ?? '');
        let rows = '';
        for (let n = 1; n <= 10; n++) {
          const left = col[`left-${n}`];
          if (left === undefined || left === null || left === '') continue;
          const right = col[`right-${n}`];
          const dt = await renderMarkdown(String(left));
          const dd = await renderMarkdown(right == null ? '' : String(right));
          rows += `<dt>${dt}</dt><dd>${dd}</dd>`;
        }
        map[id] = `<dl class="two-col-${type}">${rows}</dl>`;
      }
    } catch {
      /* leave map empty; markers stay in place */
    }
    return map;
  })();
  return twoColCache;
}
