import { defineConfig } from '@nuasite/nua/config';
import rehypeRaw from 'rehype-raw';
import { legacyImageAttributes } from './src/remark/legacy-image-attributes';
import { remarkCzechTypography } from './src/remark/czech-typography';
import { remarkShortcodes } from './src/remark/shortcodes';
import { redirects } from './src/lib/redirects';
import { mergeRedirects } from './src/lib/merge-redirects';
import { collectionLabels } from './src/lib/collection-labels';

const site = process.env.DEPLOY_PRIME_URL || 'https://www.ochrance.cz/';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // cs at /, en at /en/ — mirrors the Hugo per-language content dirs.
  i18n: {
    defaultLocale: 'cs',
    locales: ['cs', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  redirects: Object.fromEntries(Object.entries(redirects).map(([from, destination]) => [from, { destination, status: 301 }])),
  // Runs after nua's integration, which would otherwise clobber public/_redirects.
  integrations: [mergeRedirects()],
  nua: {
    // Collection data contains Markdown fields, including some historical HTML
    // tables. Disable MDX so those fields can render with rehype-raw.
    mdx: false,
    cms: {
      collections: collectionLabels,
      cmsConfig: {
        // Keep metadata open for both Markdown entries and data-only collections.
        openMetadataByDefault: true,
        features: { collectionManagement: false, pageEditing: false },
      },
    },
  },
  markdown: {
    // Shortcodes first (reconstruct/replace before typography mangles text), then typography.
    remarkPlugins: [remarkShortcodes, remarkCzechTypography],
    rehypePlugins: [rehypeRaw, legacyImageAttributes], // CMS/TYPO3 raw HTML in bodies survives
    remarkRehype: { allowDangerousHtml: true },
  },
  vite: {
    // The optional local collections admin is loaded through a virtual entry.
    // Prebundle React so its named hooks work in the browser during `nua dev`.
    optimizeDeps: { include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'debug', 'extend', 'acorn-jsx'] },
    esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: [
            'legacy-js-api', 'import', 'global-builtin',
            'color-functions', 'slash-div', 'if-function', 'mixed-decls',
          ],
        },
      },
    },
  },
});
