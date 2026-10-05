import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import remarkDirective from 'remark-directive';

// Nua's body editor parses Markdown with remark-mdx. A public Astro render can
// succeed while this parser rejects HTML void tags, Hugo shortcodes or autolinks.
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).use(remarkMdx);
let checked = 0;
for (const group of readdirSync('src/content', { withFileTypes: true })) {
  if (!group.isDirectory()) continue;
  for (const name of readdirSync(join('src/content', group.name))) {
    if (!name.endsWith('.md')) continue;
    const file = join('src/content', group.name, name);
    const { content } = matter(readFileSync(file, 'utf8'));
    let tree;
    try { tree = parser.parse(content); } catch (error) { throw new Error(`${file}: ${error}`, { cause: error }); }
    visit(tree, (node: any) => {
      // The MDX editor silently discards standalone HTML void nodes on save.
      // Nested legacy table markup is preserved inside the enclosing block card.
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        assert.ok(!['img', 'br', 'hr'].includes(node.name), `${file}: use Markdown for images/breaks`);
        return 'skip' as any;
      }
      assert.ok(!['mdxFlowExpression', 'mdxTextExpression'].includes(node.type), `${file}: literal text must not become a JS expression`);
    });
    checked++;
  }
}
console.log(`Verified ${checked} collection bodies with the rich editor's MDX parser.`);
