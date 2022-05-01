# browser-extension-framework

This is the core of BrowserExtensionFramework.


## Design

The source code is laid out across these directories:

* `api/`
   * The code in this directory is the public API for the framework. It exposes `BackendWiring` and `PageWiring` classes
     which must be called by user code.
* `impl/`
   * Various implementation code.
* `vendor/`
   * Vendor-specific code. TypeScript type declaration files for browser (vendor) JavaScript APIs. This means there are `.d.ts` files for
     Chromium's `chrome` JavaScript APIs and Firefox's `browser` JavaScript APIs. Yes there is probably an open source
     version of this but I would prefer to minimize third-party dependencies where feasible (Update: I'm happy to depend
     on first-party libraries from, for example, Mozilla. I think they have a nice polyfill).
* `rpc/`
   * The code in this directory implements a generic Remote Procedure Call (RPC) framework for browser extensions. This
     code has components that run in all contexts: background scripts, popup scripts, content scripts, and the web
     page.
   * For more information, see [RPC Framework](#rpc-framework)
* `example/`
   * An example project that consumes BrowserExtensionFramework.


## Development Instructions

Follow these instructions to build BrowserExtensionFramework:

1. Install dependencies
    * ```shell
      npm install
      ```
2. Build the library distributions:
    * ```shell
      npm run build
      ```
    * Notice that this builds builds *distributions* (plural!) not just a single distribution. Most libraries will publish
      a main artifact, but BrowserExtensionFramework needs to publish three equally important artifacts. There is an artifact
      for each JavaScript execution environment in a browser extension architecture: 1) backend 2) content script and 3)
      web page. 
