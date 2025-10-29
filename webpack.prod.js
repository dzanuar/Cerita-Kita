const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin'); // Untuk minify CSS
const TerserPlugin = require('terser-webpack-plugin'); // Untuk minify JS (bawaan webpack 5, tapi eksplisit lebih baik)
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const path = require('path');

// HAPUS: 'WorkboxPlugin' dan 'path' tidak diperlukan lagi di file INI

module.exports = merge(common, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // Ekstrak CSS ke file
          'css-loader',
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    // Apply Workbox InjectManifest here so it's executed only during
    // production build (npm run build). This prevents duplicate
    // injections when using webpack-dev-server (watch mode).
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: path.resolve(__dirname, 'src/scripts/sw.js'),
      swDest: 'sw.js',
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(), // Minify JS
      new CssMinimizerPlugin(), // Minify CSS
    ],
  },
});