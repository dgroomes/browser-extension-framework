# browser-extension-framework

This is the core of BrowserExtensionFramework.


## Design

The source code is laid out across these directories:

* `api/`
   * The code in this directory is the public API for the framework. It exposes `BackendWiring` and `PageWiring` classes
     which must be called by user code.
* `impl/`
   * Various implementation code.
* `rpc/`
   * The code in this directory implements a generic Remote Procedure Call (RPC) framework for browser extensions. This
     code has components that run in all contexts: background scripts, popup scripts, content scripts, and the web
     page.
   * For more information, see [RPC Framework](#rpc-framework)
* `example/`
   * An example project that consumes BrowserExtensionFramework.


## Development Instructions

Follow these instructions to build BrowserExtensionFramework:

1. Install dependencies:
    * ```shell
      npm install
      ```
2. Transpile the TypeScript:
    * ```shell
      npm run transpile
      ```
3. Bundle the JavaScript code:
    * ```shell
      npm run bundle-js
      ```
4. Bundle the TypeScript declarations:
    * ```shell
      npm run bundle-types
      ```
5. Package the library distribution:
    * ```shell
      npm pack
      ```
    * Notice the file `dgroomes-browser-extension-framework-0.1.0.tgz`. By packing a distribution file, we can consume
      BrowserExtensionFramework from another local npm project.

The final result of the build process is three artifacts:

* `dist/index.mjs`
  * This is the main code. 
* `dist/index.d.ts`
  * This is a TypeScript declaration file. It gives TypeScript projects type information that describes the main code.  
* `content-script-middleware.js`
  * This is a special file. Most libraries will publish a main artifact, and sometimes TypeScript declaration files, but
    BrowserExtensionFramework needs to publish an additional artifact. The `content-script-middleware.js` file should be
    loaded in a "content script" by a browser extension. It should be loaded as-is. It does not export anything (and thus
    is suffixed with plain `.js` instead of `.mjs`). It sets up the necessary listeners and glue code that allows
    BrowserExtensionFramework to communicate through the content script between context like popup scripts and web page
    scripts.
