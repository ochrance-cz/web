import data from './leaflet-attachments.json';
import type { AttachmentItem } from './attachment-files';

export function getLeafletAttachments(locale: 'cs' | 'en', slug: string): AttachmentItem[] {
  return (data[locale] as Record<string, AttachmentItem[]>)[slug] ?? [];
}
