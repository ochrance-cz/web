import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { VFile } from 'vfile';
import { legacyImageAttributes } from '../remark/legacy-image-attributes';
import { remarkCzechTypography } from '../remark/czech-typography';
import { remarkShortcodes } from '../remark/shortcodes';

// Frontmatter Markdown intentionally skips Astro's smartypants pre-pass. Imported
// HTML already carries its original punctuation, while shortcode arguments must
// remain straight-quoted so URLs and identifiers are parsed verbatim.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkShortcodes)
  .use(remarkCzechTypography)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(legacyImageAttributes)
  .use(rehypeStringify, { allowDangerousHtml: true });

/**
 * Render a frontmatter markdown/HTML string to HTML (use with `set:html`).
 * Many `perex` values are already raw `<p>…</p>` HTML — rehype-raw passes them
 * through. This is also used for CMS Markdown fields stored in frontmatter.
 */
export async function renderMarkdown(raw: string | undefined | null, filePath?: string): Promise<string> {
  if (!raw) return '';
  return String(await processor.process(new VFile({ value: raw, path: filePath })));
}

export default renderMarkdown;
