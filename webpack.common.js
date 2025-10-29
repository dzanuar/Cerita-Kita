// webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'src/scripts/index.js'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
    assetModuleFilename: 'assets/[hash][ext][query]',
    publicPath: '/', 
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        // ✅ Loader untuk gambar PNG, JPG, SVG dll
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[hash][ext][query]',
        },
      },
      {
        // ✅ Loader untuk file font jika dibutuhkan
        test: /\.(woff(2)?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      // Template exists at src/index.html in this project
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
    }),

    // ✅ Menyalin file statis (manifest, icons, dll)
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/public'),
          to: path.resolve(__dirname, 'dist'),
        },
      ],
    }),

    // ✅ Gunakan InjectManifest agar kita bisa menulis custom service worker (push, sync, dll)
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: path.resolve(__dirname, 'src/scripts/sw.js'),
      swDest: 'sw.js',
      // max size default is small; naikkan jika Anda memiliki aset besar untuk precache
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    }),
    // Inject environment variables into client bundle at build time.
    new webpack.DefinePlugin({
      'process.env': {
        PUSH_SERVER_URL: JSON.stringify(process.env.PUSH_SERVER_URL || ''),
        VAPID_PUBLIC_KEY: JSON.stringify(process.env.VAPID_PUBLIC_KEY || ''),
      },
    }),
  ],
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
};