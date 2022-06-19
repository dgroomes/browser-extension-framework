export default [
    {
        input: 'transpiled/index.js',
        output: {
            file: 'dist/index.mjs',
            format: 'esm'
        }
    },
    {
        input: 'transpiled/impl/content-script-middleware.js',
        output: {
            file: 'dist/content-script-middleware.js',
            format: 'esm'
        }
    }
]
