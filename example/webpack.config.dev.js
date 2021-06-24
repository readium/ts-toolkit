const path = require('path');

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: './src/main.ts',
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      }
    ]
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: [".ts", ".tsx", ".js"]
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'jellybookslib.js',
    library: 'jellybookslib',
    libraryTarget: 'var'
  }
};
