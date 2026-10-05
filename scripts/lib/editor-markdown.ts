import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

// Require a complete tag name followed by whitespace, `>` or `/>`. The broader
// `<\/?[A-Za-z][^>]*>` also matched Markdown autolinks such as `<https://…>` and
// `<editor@example.com>`, causing already-clean Markdown to be converted twice.
const HTML_TAG = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>/;
const IMPORT_COMMENT = /<!--\s*imported from the old website\s*-->/gi;
const HUGO_SHORTCODE = /\{\{[<%][\s\S]*?[>%]\}\}/g;
const LEGACY_TABLE = /<table\b[\s\S]*?<\/table>/gi;
const LEGACY_MEDIA = /<(?:iframe|video|audio)\b[\s\S]*?<\/(?:iframe|video|audio)>/gi;
const LEGACY_IMAGE = /<img\b[^>]*>/gi;
const LEGACY_CARD = /<a\b[^>]*class=["'][^"']*\b_domek\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
const MARKDOWN_LINK = /!?\[[^\]]*\]\((?:\\.|[^)])*\)/g;
const MARKDOWN_AUTOLINK = /<(?:https?:\/\/|mailto:)[^>]+>/gi;
const SPACER_PARAGRAPH = /<p\b[^>]*>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi;
const markdownParser = unified().use(remarkParse);
const PAIRED_SHORTCODES = new Set([
  'rozbal', 'nevhodne', 'vhodne', 'priklad', 'rady', 'pravni',
  'procesni', 'vecne', 'ukol', 'hodnoceni', 'cas',
]);

/** Turndown can indent HTML formerly nested between shortcode markers as code. */
function normalizeShortcodeIndent(markdown: string): string {
  let depth = 0;
  return markdown.split('\n').map((line) => {
    const shortcode = line.trim().match(/^\{\{[<%]-?\s*(\/)?([\w-]+)/);
    const name = shortcode?.[2];
    const isPaired = !!name && PAIRED_SHORTCODES.has(name);
    if (shortcode?.[1] && isPaired) depth = Math.max(0, depth - 1);
    const result = depth > 0 ? line.replace(/^ {4}/, '') : line;
    if (!shortcode?.[1] && isPaired) depth++;
    return result;
  }).join('\n');
}

/** Remove only emphasis markers which CommonMark leaves visible as plain text. */
function stripUnparsedEmphasisMarkers(markdown: string): string {
  const offsets = new Set<number>();
  const tree = markdownParser.parse(markdown);
  visit(tree, 'text', (node: { position?: { start: { offset?: number }, end: { offset?: number } } }) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    for (let offset = start; offset < end; offset++) {
      if (markdown[offset] !== '*') continue;
      let escapes = 0;
      for (let index = offset - 1; index >= 0 && markdown[index] === '\\'; index--) escapes++;
      if (escapes % 2 === 0) offsets.add(offset);
    }
  });
  return markdown.split('').filter((_character, offset) => !offsets.has(offset)).join('');
}

/**
 * Convert legacy TYPO3/Hugo HTML into Markdown that Nua's rich editor can edit.
 *
 * Complex legacy tables cannot be represented losslessly by GFM (which requires a
 * header row and cannot contain lists/paragraphs inside cells). Keep those isolated
 * blocks as HTML so their public rendering remains pixel-compatible; the surrounding
 * body and all ordinary articles are still clean Markdown in the editor.
 */
function createService(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  });
  service.use(gfm);
  service.addRule('links-with-clean-destinations', {
    filter: 'a',
    replacement: (content, node) => {
      const element = node as Element;
      const href = element.getAttribute('href')?.trim();
      if (!href) return content;
      const title = element.getAttribute('title')?.trim();
      const destination = /[\s()]/u.test(href) ? `<${href}>` : href;
      return `[${content}](${destination}${title ? ` \"${title.replace(/\"/g, '\\\"')}\"` : ''})`;
    },
  });
  service.addRule('lossless-legacy-images', {
    filter: 'img',
    replacement: (_content, node) => {
      const element = node as Element;
      const src = element.getAttribute('src')?.trim() ?? '';
      const mustRemainHtml =
        /\b(?:width|height|style|class|align|border|hspace|vspace)=/iu.test(element.outerHTML)
        || !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/iu.test(src);
      if (mustRemainHtml) return element.outerHTML;

      const alt = (element.getAttribute('alt') ?? '').replace(/([\\\[\]_*])/g, '\\$1');
      const title = element.getAttribute('title')?.trim();
      const destination = /[\s()]/u.test(src) ? `<${src}>` : src;
      return `![${alt}](${destination}${title ? ` \"${title.replace(/\"/g, '\\\"')}\"` : ''})`;
    },
  });
  return service;
}

const service = createService();

/** Leave already-clean Markdown untouched; convert only strings that contain HTML. */
export function editorMarkdown(value: string): string {
  const withoutMarker = value.replace(IMPORT_COMMENT, '').trim();
  const withoutShortcodes = withoutMarker
    .replace(HUGO_SHORTCODE, '')
    .replace(LEGACY_TABLE, '')
    .replace(LEGACY_MEDIA, '')
    .replace(LEGACY_CARD, '')
    .replace(LEGACY_IMAGE, '');
  let markdown = withoutMarker;

  if (HTML_TAG.test(withoutShortcodes)) {
    const protectedBlocks: string[] = [];
    let spacerCount = 0;
    const protectedHtml = withoutMarker
      // These constructs are already lossless and editor-safe (or cannot be
      // represented by Markdown). Keep their original bytes out of Turndown's DOM
      // parser so attributes, whitespace and embedded media survive unchanged.
      .replace(LEGACY_TABLE, protect)
      .replace(LEGACY_MEDIA, protect)
      .replace(LEGACY_CARD, protect)
      .replace(HUGO_SHORTCODE, protect)
      .replace(MARKDOWN_LINK, protect)
      .replace(MARKDOWN_AUTOLINK, protect)
      .replace(SPACER_PARAGRAPH, () => `NUASPACER${spacerCount++}PLACEHOLDER`);
    markdown = service.turndown(protectedHtml);
    for (let index = 0; index < spacerCount; index++) {
      markdown = markdown.replace(
        `NUASPACER${index}PLACEHOLDER`,
        '\n\n\u00a0\n\n',
      );
    }
    markdown = stripUnparsedEmphasisMarkers(
      markdown
        // Adjacent legacy emphasis elements sometimes split a word (for example
        // `<em>Kance</em><em>láře</em>`). Join that text before validating markers.
        .replace(/(?<=[\p{L}\p{N}])\*+(?=[\p{L}\p{N}])/gu, '')
        // A numbered legacy paragraph must not become a Markdown list item.
        .replace(/^(\d+)\)/gmu, '$1\\)')
        // Four spaces would turn ordinary quoted text into a code block.
        .replace(/^>\s{4,}(?=\S)/gmu, '> '),
    );

    protectedBlocks.forEach((block, index) => {
      markdown = markdown.replace(
        `NUAPROTECTED${index}PLACEHOLDER`,
        `\n\n${block.trim()}\n\n`,
      );
    });

    function protect(block: string): string {
      const token = `NUAPROTECTED${protectedBlocks.length}PLACEHOLDER`;
      protectedBlocks.push(block);
      return token;
    }
  }

  return normalizeShortcodeIndent(markdown)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasLegacyHtml(value: string): boolean {
  return HTML_TAG.test(
    value
      .replace(IMPORT_COMMENT, '')
      .replace(HUGO_SHORTCODE, '')
      .replace(LEGACY_TABLE, '')
      .replace(LEGACY_MEDIA, '')
      .replace(LEGACY_CARD, '')
      .replace(LEGACY_IMAGE, ''),
  );
}
