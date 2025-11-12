// webpack.prod.js
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const webpack = require('webpack');

module.exports = merge(common, {
  mode: 'production',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [{ test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] }],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: path.resolve(__dirname, 'src/scripts/sw.js'),
      swDest: 'sw.js',
      maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    }),
    new webpack.DefinePlugin({
      __PROD__: JSON.stringify(true),
      __DEV__: JSON.stringify(false),
      'process.env.NODE_ENV': JSON.stringify('production'),

      // fallback saat build (selain env.js runtime)
      'process.env.PUSH_SERVER_URL': JSON.stringify(process.env.PUSH_SERVER_URL || ''),
      'process.env.VAPID_PUBLIC_KEY': JSON.stringify(
        process.env.VAPID_PUBLIC_KEY ||
          'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk'
      ),
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    splitChunks: { chunks: 'all' },
    runtimeChunk: 'single',
  },
  stats: { errorDetails: true },
});
