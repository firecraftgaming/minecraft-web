const path = require('path');

module.exports = {
    entry: {
        script: path.resolve(__dirname, 'src', 'index.ts'),
        worker: path.resolve(__dirname, 'src', 'worker.ts'),
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public'),
    },
    mode: 'production',
};