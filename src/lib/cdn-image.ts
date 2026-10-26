const CDN_ORIGIN = 'https://cdn.nuasite.com';

/** Whether Cloudflare can resize the image: a raster file on the Nua CDN. */
export const isResizable = (src: string): boolean => src.startsWith(`${CDN_ORIGIN}/`) && !src.endsWith('.svg');

/** Resized CDN image; other sources are served as they are. */
export const resized = (src: string, width: number): string => {
  if (!isResizable(src)) return src;
  const { origin, pathname, search } = new URL(src);
  return `${origin}/cdn-cgi/image/width=${width},quality=85,format=auto${pathname}${search}`;
};

/** A srcset of resized copies, or undefined when the image cannot be resized. */
export const srcset = (src: string, widths: readonly number[]): string | undefined =>
  isResizable(src) ? widths.map((w) => `${resized(src, w)} ${w}w`).join(', ') : undefined;
