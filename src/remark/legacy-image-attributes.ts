import attributes from '../lib/legacy-image-attributes.json';
import { visit } from 'unist-util-visit';

// Imported image presentation is kept outside editorial fields. The body uses
// standard Markdown images so the hosted rich editor cannot drop HTML void nodes.
export function legacyImageAttributes() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'img') return;
      const saved = (attributes as Record<string, Record<string, string>>)[node.properties?.src];
      if (!saved) return;
      for (const [key, value] of Object.entries(saved)) {
        const property = key === 'class' ? 'className' : key;
        if (node.properties[property] === undefined) node.properties[property] = value;
      }
    });
  };
}
