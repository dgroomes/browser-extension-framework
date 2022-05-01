const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        'dcl-page-script': './src/dcl-page-script.ts',
        'dcl-popup-script': './src/dcl-popup-script.ts'
    },
    module: {
        rules: [{
            test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/,
        }]
    },
    devtool: 'inline-source-map',
    output: {
        filename: '[name].js', path: path.resolve(__dirname, 'dist'), clean: true,
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    }
};
