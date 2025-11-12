// webpack.dev.js
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devServer: {
    static: { directory: path.join(__dirname, 'src', 'public') },
    compress: true,
    port: 9000,
    open: true,
    historyApiFallback: true,
    proxy: {
      '/v1': {
        target: 'https://story-api.dicoding.dev',
        changeOrigin: true,
        secure: true,
      },
    },
    client: { overlay: true },
    allowedHosts: 'all',
  },
  module: {
    rules: [{ test: /\.css$/i, use: ['style-loader', 'css-loader'] }],
  },
  plugins: [
    new webpack.DefinePlugin({
      __PROD__: JSON.stringify(false),
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development'),

      // fallback saat dev bila kamu belum set ENV di shell
      'process.env.PUSH_SERVER_URL': JSON.stringify(process.env.PUSH_SERVER_URL || 'http://localhost:3000'),
      'process.env.VAPID_PUBLIC_KEY': JSON.stringify(
        process.env.VAPID_PUBLIC_KEY ||
          'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk'
      ),
    }),
  ],
});
