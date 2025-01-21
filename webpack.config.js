const path = require('path');

const { CKEditorTranslationsPlugin } = require('@ckeditor/ckeditor5-dev-translations');

module.exports = {
  mode: 'production',
  entry: './custom-editor/index.tsx',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: ['ts-loader'],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
        use: ['raw-loader'],
      },
    ],
  },
  devtool: 'eval',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'static-preview/admin'),
  },
  watchOptions: {
    ignored: ['**/static-preview', '**/node_modules'],
  },
  plugins: [new CKEditorTranslationsPlugin({ language: 'cs' })],
};
