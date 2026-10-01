const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Ship the opt-in runtime with the public web build. The extension remains
// outside the public analytics boundary and does not reference these assets.
class PublicBrowserAssetsPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('PublicBrowserAssetsPlugin', compilation => {
      compilation.hooks.processAssets.tap({name: 'PublicBrowserAssetsPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL}, () => {
        const directory = path.join(__dirname, 'public', 'securedme-public');
        for (const name of fs.readdirSync(directory)) {
          compilation.emitAsset(`securedme-public/${name}`, new webpack.sources.RawSource(fs.readFileSync(path.join(directory, name))));
        }
      });
    });
  }
}

module.exports = {
  entry: {
    bundle: './src/index.js',
    'extension/sidepanel': './src/extension/SidePanelApp.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new PublicBrowserAssetsPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['bundle'],
    }),
    new HtmlWebpackPlugin({
      template: './extension/sidepanel.template.html',
      filename: 'extension/sidepanel.html',
      chunks: ['extension/sidepanel'],
    }),
  ],
};
