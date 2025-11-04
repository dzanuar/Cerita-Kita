// webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/scripts/index.js'),

  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'], // di prod akan dioverride jadi extract
      },
      {
        test: /\.js$/i,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
        type: 'asset/resource',
        generator: { filename: 'assets/[name][ext]' },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
    }),

    // Salin public (manifest, icons, screenshots, favicon) ke dist/
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'src/public'), to: path.resolve(__dirname, 'dist') },
      ],
    }),

    // Env ke client (untuk runtime config)
    new DefinePlugin({
      'process.env.VAPID_PUBLIC_KEY': JSON.stringify(process.env.VAPID_PUBLIC_KEY || ''),
      'process.env.PUSH_SERVER_URL': JSON.stringify(process.env.PUSH_SERVER_URL || ''),
    }),

    // ⬇️ PASANG InjectManifest HANYA DI SINI
    new InjectManifest({
      swSrc: path.resolve(__dirname, 'src/scripts/sw.js'),
      swDest: 'sw.js',
      maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      // Workbox akan mencari token persis `self.__WB_MANIFEST` di sw.js
    }),
  ],
};
