import type { Element, ElementContent, Properties, Root, RootContent } from 'hast';

/**
 * Turn a paragraph of two or more images into a photo gallery, in every collection.
 *
 * Editors insert photos one after another with the editor's Image button; a paragraph that
 * holds nothing but images (Markdown or imported HTML) renders as a gallery: the first photo
 * large, the others in rows of three, opening in the photo viewer on click.
 * src/components/GalleryViewer.astro, loaded on every page, carries the styles and the viewer
 * script and gives the gallery its accessible labels in the page's language (Czech or English
 * bodies are often rendered without their file path). Runs after legacyImageAttributes, whose
 * saved inline sizes would override the grid.
 */
const CDN_ORIGIN = 'https://cdn.nuasite.com';
const THUMB_WIDTHS = [320, 640, 1200];
const LEAD_SIZES = '(max-width: 600px) 90vw, 800px';
const THUMB_SIZES = '(max-width: 600px) 30vw, 270px';

const h =(tagName: string, properties: Properties = {}, children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const text = (value: string): ElementContent => ({ type: 'text', value });

const isElement = (node: RootContent | ElementContent): node is Element => node.type === 'element';

const isWhitespace = (node: ElementContent): boolean => node.type === 'text' && node.value.trim() === '';

/** Resized CDN image; other sources are served as they are. */
const resized = (src: string, width: number): string => {
  if (!src.startsWith(`${CDN_ORIGIN}/`) || src.endsWith('.svg')) return src;
  const { origin, pathname, search } = new URL(src);
  return `${origin}/cdn-cgi/image/width=${width},quality=85,format=auto${pathname}${search}`;
};

/** The images of a paragraph that contains two or more images and nothing else. */
const galleryImages = (node: Element): Element[] | undefined => {
  if (node.tagName !== 'p') return undefined;
  const images: Element[] = [];
  for (const child of node.children) {
    if (isWhitespace(child)) continue;
    if (child.type === 'element' && child.tagName === 'br') continue;
    if (!isElement(child) || child.tagName !== 'img') return undefined;
    images.push(child);
  }
  return images.length >= 2 ? images : undefined;
};

const galleryItem = (image: Element, index: number): Element => {
  const src = String(image.properties.src ?? '');
  const title = typeof image.properties.title === 'string' ? image.properties.title.trim() : '';
  delete image.properties.title;
  delete image.properties.style;
  delete image.properties.align;
  if (src.startsWith(`${CDN_ORIGIN}/`) && !src.endsWith('.svg')) {
    image.properties.src = resized(src, THUMB_WIDTHS[THUMB_WIDTHS.length - 1]!);
    image.properties.srcset = THUMB_WIDTHS.map((w) => `${resized(src, w)} ${w}w`).join(', ');
    image.properties.sizes = index === 0 ? LEAD_SIZES : THUMB_SIZES;
  }
  image.properties.loading ??= 'lazy';
  image.properties.decoding ??= 'async';

  const button = h('button', { type: 'button', className: ['gallery-open'], dataSrc: resized(src, 1600), ariaHasPopup: 'dialog' }, [image]);
  const figure = h('figure', {}, title ? [button, h('figcaption', {}, [text(title)])] : [button]);
  return h('li', {}, [figure]);
};

const viewer = (): Element =>
  h('dialog', { className: ['gallery-dialog'] }, [
    h('button', { type: 'button', className: ['gallery-close'] }, [text('×')]),
    h('figure', { className: ['gallery-stage'] }, [
      h('img', { className: ['gallery-full'], alt: '' }),
      h('figcaption', { className: ['gallery-caption'] }),
    ]),
    h('button', { type: 'button', className: ['gallery-prev'] }, [text('‹')]),
    h('button', { type: 'button', className: ['gallery-next'] }, [text('›')]),
    h('div', { className: ['gallery-thumbnails'] }),
    h('span', { className: ['gallery-position'], ariaLive: 'polite' }),
  ]);

const gallery = (images: Element[]): Element =>
  h('div', { className: ['editorial-gallery'], role: 'group' }, [
    h('ul', { className: ['gallery-grid'] }, images.map(galleryItem)),
    viewer(),
  ]);

const walk = (children: Array<RootContent | ElementContent>): void => {
  for (let i = 0; i < children.length; i++) {
    const node = children[i]!;
    if (!isElement(node)) continue;
    const images = galleryImages(node);
    if (images) children[i] = gallery(images);
    else walk(node.children);
  }
};

export function bodyGalleries() {
  return (tree: Root) => {
    walk(tree.children);
  };
}
