const path = require('path');

module.exports = {
  mode: 'production',
  entry: './custom-editor/index.tsx',
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
};
