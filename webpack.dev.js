// webpack.dev.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    open: true,
    compress: true,
    port: 9000,
    historyApiFallback: true, // ✅ Agar hash routing tetap berfungsi
  },
  optimization: {
    runtimeChunk: 'single',
  },
});
