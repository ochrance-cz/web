import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import assert from 'node:assert/strict';
import { Ctx, Container, Clock } from '@milkdown/ctx';
import { editorViewCtx, nodesCtx, marksCtx, remarkPluginsCtx, remarkStringifyOptionsCtx } from '@milkdown/core';
import { schema as commonmarkSchema } from '@milkdown/preset-commonmark';
import { schema as gfmSchema } from '@milkdown/preset-gfm';
import { Schema } from '@milkdown/prose/model';
import { SerializerState } from '@milkdown/transformer';
// Neither package exports the plugin, so it is read from the installed sources.
import { markWhitespacePlugin } from '../node_modules/@nuasite/cms-mdx-editor/src/mark-whitespace';
import { markWhitespacePlugin as nativeMarkWhitespacePlugin } from '../node_modules/@nuasite/cms/src/editor/mark-whitespace';

// Bold/italic whose markers sit next to whitespace inside them (`**Otázka?  **`,
// typically a non-breaking space pasted from Word) is not emphasis in Markdown:
// the site then shows the asterisks literally. Any unescaped `*` left in a parsed
// text node is such a marker, so report it with its line.
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.mdx?$/.test(file) ? [file] : [];
  });
}

const remark = unified().use(remarkParse).use(remarkGfm);

// Save with the editors' real serializer: bold/italic ending or starting with a
// non-breaking space (pasted from Word), inside a highlighted box, must stay bold.
// The fix is a remark plugin (`$remark`) that wraps the compiler, so it has to be
// registered on the same unified processor the serializer stringifies with.
for (const plugin of [markWhitespacePlugin, nativeMarkWhitespacePlugin]) {
  const ctx = new Ctx(new Container(), new Clock());
  // The paragraph serializer reads the editor view; there is none outside the browser.
  ctx.inject(nodesCtx).inject(marksCtx).inject(remarkStringifyOptionsCtx).inject(remarkPluginsCtx, []).inject(editorViewCtx, {} as any);
  // Nothing here waits on editor timers (the plugin waits for InitReady).
  (ctx as any).wait = async () => {};
  for (const part of [...commonmarkSchema, ...gfmSchema, ...plugin]) await part(ctx)();
  const registered = ctx.get(remarkPluginsCtx);
  assert.equal(registered.length, 1, 'the mark whitespace plugin registers one remark plugin');
  const schema = new Schema({ nodes: Object.fromEntries(ctx.get(nodesCtx)), marks: Object.fromEntries(ctx.get(marksCtx)) });
  // Used after remark-stringify: the plugin wraps the compiler that one installs.
  const editorRemark = registered.reduce(
    (processor: any, { plugin: remarkPlugin, options }) => processor.use(remarkPlugin, options),
    unified().use(remarkParse).use(remarkStringify, ctx.get(remarkStringifyOptionsCtx)).use(remarkGfm),
  );
  const { strong, emphasis } = schema.marks;
  const doc = schema.node('doc', null, [schema.node('blockquote', null, [
    schema.node('paragraph', null, [schema.text('Otázka?\u00a0\u00a0', [strong.create()])]),
    schema.node('paragraph', null, [
      schema.text('Text '),
      schema.text('\u00a0kurzíva\t', [emphasis.create()]),
      schema.text('a '),
      schema.text('\u00a0', [strong.create()]),
      schema.text('konec.'),
    ]),
  ])]);
  const saved = SerializerState.create(schema, editorRemark)(doc);
  assert.equal(saved, '> **Otázka?**\u00a0\u00a0\n>\n> Text \u00a0*kurzíva*\ta \u00a0konec.\n', 'editor must keep whitespace outside bold/italic markers');
}
const findings: string[] = [];
const bodies = files('src/content');
for (const file of bodies) {
  const source = readFileSync(file, 'utf8');
  const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] ?? '';
  const body = source.slice(frontmatter.length);
  const lineOffset = frontmatter.split('\n').length - 1;
  visit(remark.parse(body), 'text', (node: any) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    const raw = body.slice(start, end);
    if (!/(?<!\\)\*/.test(raw)) return;
    const line = node.position.start.line + lineOffset;
    const snippet = raw.replace(/\u00a0/g, '⍽').replace(/\s+/g, ' ').trim().slice(0, 120);
    findings.push(`${file}:${line}  ${snippet}`);
  });
}

if (findings.length) {
  console.error(`Found ${findings.length} literal asterisks (⍽ = non-breaking space):\n${findings.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Checked ${bodies.length} collection bodies; no literal asterisks from broken bold or italic.`);
