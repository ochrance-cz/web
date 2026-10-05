// Shared sort logic for the `umluva` collection (CRPD articles).
// Underscore-prefixed → ignored by Astro's file-based routing.
import type { CollectionEntry } from 'astro:content';

/** Article order parsed from the slug (clanek-00 … clanek-50); Preambule = 0. */
export function articleNum(id: string): number {
  const m = id.match(/clanek-(\d+)/);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

/** Sort entries by article number, falling back to Czech title collation. */
export function sortArticles(
  entries: CollectionEntry<'umluva'>[],
): CollectionEntry<'umluva'>[] {
  return [...entries].sort((a, b) => {
    const na = articleNum(a.id);
    const nb = articleNum(b.id);
    if (na !== nb) return na - nb;
    return a.data.title.localeCompare(b.data.title, 'cs');
  });
}
