export type AttachmentItem = { title?: string; text?: string; link?: string; file?: string };

/**
 * Pletivo (Nua's renderer) has no Vite `import.meta.glob`, so sibling-file refs
 * next to markdown don't resolve. Attachment `file` values are absolute
 * `/media/...` (public/media) or external URLs — pure pass-through.
 */
export function resolveAttachments(a: AttachmentItem[] | undefined | null): AttachmentItem[] {
  return a ?? [];
}

export default resolveAttachments;
