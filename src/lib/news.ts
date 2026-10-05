import { getCollection, type CollectionEntry } from 'astro:content';

type NewsCollection = 'aktualne' | 'aktualne-en';

// Keep the CMS schema as a direct n.object: Nua's schema scanner cannot read
// a whole-object .transform(). Adapt editorial names only at the rendering edge.
export async function getNews<C extends NewsCollection>(
  collection: C,
  filter?: (entry: CollectionEntry<C>) => boolean,
) {
  return newsEntries(await getCollection(collection, filter), collection);
}

export function newsEntries<C extends NewsCollection>(entries: CollectionEntry<C>[], collection: C) {
  return entries.map(entry => {
    const cs = entry.data as CollectionEntry<'aktualne'>['data'];
    const en = entry.data as CollectionEntry<'aktualne-en'>['data'];
    return {
      ...entry,
      data: {
        ...entry.data,
        body: entry.body,
        vystupy: collection === 'aktualne' ? cs.kategorie : en.categories,
        illustration: collection === 'aktualne' ? cs.obrazek : en.illustration,
      },
    };
  });
}
