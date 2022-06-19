/**
 * Set the "context" to "window" to avoid the Rollup warning https://rollupjs.org/guide/en/#error-this-is-undefined.
 * BrowserExtensionFramework runs in browsers, so 'window' is the correct thing to refer to the "global this".
 *
 * See a general discussion about Rollup's "context" here https://github.com/rollup/rollup/issues/3788
 */
function contextWindow(config) {
    config.context = "window"
}

const config = [
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

// Apply common config
config.map(config => contextWindow(config))

export default config
