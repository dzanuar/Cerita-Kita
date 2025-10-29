// webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin'); // <-- BUTUH INI
const webpack = require('webpack'); // <-- BUTUH INI

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
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[hash][ext][query]',
        },
      },
      {
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
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/public'),
          to: path.resolve(__dirname, 'dist'),
        },
      ],
    }),

    // ✅ InjectManifest HANYA DI SINI
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: path.resolve(__dirname, 'src/scripts/sw.js'),
      swDest: 'sw.js', // Pastikan nama output ini konsisten
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    }),
    
    // ✅ DefinePlugin di sini
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
      path: false, // Polyfill path sudah kita hapus dependensinya
    },
  },
};