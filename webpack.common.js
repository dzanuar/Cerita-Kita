// webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const webpack = require('webpack'); // <-- HAPUS INI

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'src/scripts/index.js'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js', 
    clean: true,
    assetModuleFilename: 'images/[name][ext]',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      inject: 'body',
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'src/public', to: '.' }],
    }),
    
    // new webpack.DefinePlugin({ ... }) // <-- HAPUS SELURUH BLOK INI DARI SINI
  ],
  module: {
    rules: [
      // ... (rules Anda tetap sama) ...
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: { extensions: ['.js'] },
};