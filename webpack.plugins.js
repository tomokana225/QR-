const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  new CopyWebpackPlugin({
    patterns: [
      {
        from: path.resolve(__dirname, 'public'),
        to: 'main_window',
        noErrorOnMissing: true,
        globOptions: {
            // The index.html is handled by the Webpack plugin, so we ignore it here.
            // Also ignore service-worker and manifest as they are for PWA functionality not needed in Electron.
            ignore: ['**/index.html', '**/service-worker.js', '**/manifest.json'],
        }
      }
    ]
  })
];