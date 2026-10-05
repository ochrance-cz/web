import type { Root, RootContent } from 'mdast';

/**
 * Reproduces Hugo shortcodes as HTML, operating on the mdast root.
 *
 * Self-closing shortcodes ({{< youtube url >}}, links, button, sloupce,
 * collection-link) and paired shortcodes ({{% nevhodne %}}…{{% /nevhodne %}},
 * {{< rozbal "T" >}}…, cas) appear as their own block paragraphs. We reconstruct
 * each paragraph's raw text (which survives remark-gfm autolinking of bare URLs by
 * re-reading link nodes) and swap in the exact HTML the Hugo templates emit.
 * rehype-raw (markdown pipeline) re-parses the emitted HTML, so open/close
 * fragments balance across sibling nodes.
 */

const SELF = new Set(['youtube', 'links', 'button', 'sloupce', 'collection-link']);
const PAIRED = new Set([
  'rozbal', 'nevhodne', 'vhodne', 'priklad', 'rady', 'pravni',
  'procesni', 'vecne', 'ukol', 'hodnoceni', 'cas',
]);

const SC_RE = /^\{\{([<%])-?\s*(\/?)([\w-]+)((?:\s[\s\S]*?)?)\s*-?\s*([>%])\}\}$/;

interface Parsed { name: string; args: string[]; kind: 'self' | 'open' | 'close'; }

function rawText(node: any): string {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'break') return '\n';
  if (node.type === 'link') {
    const inner = (node.children || []).map(rawText).join('');
    return inner || node.url || '';
  }
  if (node.children) return node.children.map(rawText).join('');
  return '';
}

function parseArgs(s: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s.trim()))) out.push(m[1] !== undefined ? m[1] : m[2]);
  return out;
}

function parseShortcode(raw: string): Parsed | null {
  const m = SC_RE.exec(raw.trim());
  if (!m) return null;
  const args = m[4] ?? '';
  if (args.includes('}}') || args.includes('{{')) return null; // not a single shortcode
  const name = m[3];
  if (m[2] === '/') return { name, args: [], kind: 'close' };
  if (SELF.has(name)) return { name, args: parseArgs(args), kind: 'self' };
  if (PAIRED.has(name)) return { name, args: parseArgs(args), kind: 'open' };
  return null;
}

function youtubeId(url: string): string {
  return (url || '')
    .replace('https://youtu.be/', '')
    .replace('https://www.youtube.com/watch?v=', '')
    .replace('https://www.youtube.com/embed/', '')
    .trim();
}

function emitSelf(name: string, args: string[]): string {
  switch (name) {
    case 'youtube':
      return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;"><iframe src="https://www.youtube.com/embed/${youtubeId(args[0])}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen title="YouTube Video"></iframe></div>`;
    case 'links': {
      let li = `<li><a href="${args[0] ?? ''}">${args[1] ?? ''}</a></li>`;
      if (args[2]) li += `<li><a href="${args[2]}">${args[3] ?? ''}</a></li>`;
      return `<ul class="_link-list">${li}</ul>`;
    }
    case 'button':
      return `<a href="${args[0] ?? ''}" class="_button">${args[1] ?? ''}</a>`;
    case 'collection-link':
      return `<a href="/srozumitelne/${args[0] ?? ''}/">${args[0] ?? ''}</a>`;
    case 'sloupce':
      // two-column comparisons live in srozumitelne page params (cross-page lookup);
      // emit a marker the guide section can hydrate. Rare (5 uses).
      return `<!-- sloupce:${args[0] ?? ''} -->`;
    default:
      return '';
  }
}

let collapsibleCounter = 0;

function pairedWrap(name: string, args: string[]): [string, string] {
  if (name === 'rozbal') {
    const id = `rozbal-${++collapsibleCounter}`;
    const title = args[0] ?? '';
    const open =
      `<div class="_collapsible"><input type="checkbox" id="${id}"><div class="box">` +
      `<h3 class="title"><span class="chevron" aria-hidden="true"></span>` +
      `<label role="button" tabindex="0" class="opener" for="${id}" aria-controls="${id}-content" aria-expanded="false">${title}</label></h3>` +
      `<div class="content" id="${id}-content">`;
    return [open, `</div></div></div>`];
  }
  return [`<div class="special-${name}">`, `</div>`];
}

function emitCas(inner: RootContent[]): string {
  const text = inner.map(rawText).join('\n');
  const rows = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [dt, ...rest] = line.split('::');
      return `<dt>${(dt ?? '').trim()}</dt><dd>${rest.join('::').trim()}</dd>`;
    })
    .join('');
  return `<dl class="_timeline">${rows}</dl>`;
}

// Container node types whose children may themselves hold shortcode paragraphs
// (e.g. an indented {{% vhodne %}}…{{% /vhodne %}} inside a list item).
const CONTAINER = new Set(['listItem', 'list', 'blockquote']);

function processChildren(children: RootContent[]): RootContent[] {
  const out: RootContent[] = [];
  let i = 0;
  while (i < children.length) {
    const node = children[i];
    // Recurse into containers first so nested shortcodes are handled too.
    if (node && CONTAINER.has(node.type) && (node as any).children) {
      (node as any).children = processChildren((node as any).children);
    }
    const raw = node.type === 'paragraph' ? rawText(node).trim() : '';
      // The WYSIWYG YouTube button writes this leaf directive into Markdown
      // fields. Render it with the same responsive embed as legacy shortcodes.
      const editorVideo = /^::youtube\{#([A-Za-z0-9_-]{11})\}$/.exec(raw);
      if (editorVideo) {
        out.push({ type: 'html', value: emitSelf('youtube', [editorVideo[1]]) } as RootContent);
        i++;
        continue;
      }
      const sc = raw.startsWith('{{') ? parseShortcode(raw) : null;

      if (sc && sc.kind === 'self') {
        out.push({ type: 'html', value: emitSelf(sc.name, sc.args) } as RootContent);
        i++;
        continue;
      }
      if (sc && sc.kind === 'open') {
        let depth = 1;
        let j = i + 1;
        for (; j < children.length; j++) {
          const c = children[j];
          const r2 = c.type === 'paragraph' ? rawText(c).trim() : '';
          const s2 = r2.startsWith('{{') ? parseShortcode(r2) : null;
          if (s2 && s2.name === sc.name && s2.kind === 'open') depth++;
          else if (s2 && s2.name === sc.name && s2.kind === 'close') {
            depth--;
            if (depth === 0) break;
          }
        }
        const inner = children.slice(i + 1, j);
        if (sc.name === 'cas') {
          out.push({ type: 'html', value: emitCas(inner) } as RootContent);
        } else {
          const [open, close] = pairedWrap(sc.name, sc.args);
          out.push({ type: 'html', value: open } as RootContent);
          out.push(...processChildren(inner)); // handle shortcodes nested inside this block
          out.push({ type: 'html', value: close } as RootContent);
        }
        i = j < children.length ? j + 1 : children.length;
        continue;
      }
      if (sc && sc.kind === 'close') {
        i++; // drop stray closer
        continue;
      }
      out.push(node);
      i++;
    }
  return out;
}

export function remarkShortcodes() {
  return (tree: Root) => {
    collapsibleCounter = 0;
    tree.children = processChildren(tree.children);
  };
}

export default remarkShortcodes;
