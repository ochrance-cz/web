import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';

const NBSP = ' ';

// Single-letter Czech prepositions/conjunctions that must not end a line.
const ONE_LETTER = /(^|[\s(„"'>])([ksvzouaiKSVZOUAI])\s+/g;

/**
 * Czech typography: non-breaking spaces after one-letter prepositions/conjunctions,
 * after § and č., and before common units/currency. Operates on text nodes only,
 * skipping code/inline-code so HTML and code survive untouched.
 */
export function remarkCzechTypography() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, _i, parent: any) => {
      if (parent && (parent.type === 'inlineCode' || parent.type === 'code')) return;
      let v = node.value;
      // one-letter words (run twice to catch overlapping matches "k o")
      v = v.replace(ONE_LETTER, (_m, pre, w) => `${pre}${w}${NBSP}`);
      v = v.replace(ONE_LETTER, (_m, pre, w) => `${pre}${w}${NBSP}`);
      // after section sign and "č." (number reference)
      v = v.replace(/§\s+/g, `§${NBSP}`);
      v = v.replace(/\bč\.\s+/g, `č.${NBSP}`);
      // thin space inside number groups like "1 000" -> nbsp
      v = v.replace(/(\d)\s+(\d{3}\b)/g, `$1${NBSP}$2`);
      // before currency / units
      v = v.replace(/\s+(Kč|%|°C|mm|cm|km|kg|m²|MB|GB)\b/g, `${NBSP}$1`);
      node.value = v;
    });
  };
}

export default remarkCzechTypography;
