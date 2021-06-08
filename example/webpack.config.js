const path = require('path');

module.exports = {
  entry: './main.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'jellybookslib.js',
    library: 'jellybookslib',
    libraryTarget: 'var'
  }
};