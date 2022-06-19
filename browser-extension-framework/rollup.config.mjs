import { nodeResolve } from '@rollup/plugin-node-resolve'

/**
 * Set the "context" to "window" to avoid the Rollup warning https://rollupjs.org/guide/en/#error-this-is-undefined.
 * BrowserExtensionFramework runs in browsers, so 'window' is the correct thing to refer to the "global this".
 *
 * See a general discussion about Rollup's "context" here https://github.com/rollup/rollup/issues/3788
 */
function contextWindow(config) {
    config.context = "window"
}

/**
 * Include the code from the other NPM workspaces in the bundle. For example, include the code in the 'browser-types/chromium-types'
 * NPM workspace in the bundle. BrowserExtensionFramework needs to be published as one package without any dependencies.
 * This makes for a good development experience for consuming applications.
 *
 * Note: I don't think this does anything actually because 'browser-types/chromium-types' is types only, there is no
 * code to bundle. I think it gets erased basically.
 */
function resolveWorkspaces() {
    config.plugins = [nodeResolve()]
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
config
    .map(config => contextWindow(config))
    .map(config => resolveWorkspaces(config))

export default config
