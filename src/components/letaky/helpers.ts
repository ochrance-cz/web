import type { CollectionEntry } from 'astro:content';

type LeafletEntry = CollectionEntry<'letaky'> | CollectionEntry<'letaky-en'>;

/** File names are the public URL slugs, editable through Rename. */
export function detailSlug(entry: LeafletEntry): string {
  return entry.id;
}

/** Labels for the alternate-format downloads and the attachments heading (cs + en). */
export const FORMAT_LABELS: Record<
  'cs' | 'en',
  { seeing: string; roma: string; kids: string; attachments: string }
> = {
  cs: {
    seeing: 'Verze pro osoby se zrakovým postižením',
    roma: 'Romská verze',
    kids: 'Verze pro děti',
    attachments: 'Přílohy a další jazykové verze',
  },
  en: {
    seeing: 'Version for the visually impaired',
    roma: 'Romani version',
    kids: 'Version for children',
    attachments: 'Attachments and other language versions',
  },
};
