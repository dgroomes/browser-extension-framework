const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        'browser-extension-framework': './browser-extension-framework.ts',
        'content-script-middleware': './content-script-middleware.ts'
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
