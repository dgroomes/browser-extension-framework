# browser-extension-framework

🛠 BrowserExtensionFramework is a zero-dependency RPC-centric framework for browser extensions (sometimes called web extensions).

## Design

**NOTE**: This project was developed on macOS. It is for my own personal use.

The source code layout:

* `api/`
    * The code in this directory is the public API for the framework. It exposes `BackendWiring` and `PageWiring` classes
      which must be called by user code.
* `impl/`
    * Various implementation code. 
* `vendor/`
    * Vendor-specific code. TypeScript type declaration files for browser (vendor) JavaScript APIs. This means there are `.d.ts` files for
      Chromium's `chrome` JavaScript APIs and FireFox's `browser` JavaScript APIs. Yes there is probably an open source
      version of this but I would prefer to minimize third-party dependencies where feasible (Update: I'm happy to depend
      on first-party libraries from, for example, Mozilla. I think they have a nice polyfill).
* `rpc/`
    * The code in this directory implements a generic Remote Procedure Call (RPC) framework for browser extensions. This
      code has components that run in all contexts: background scripts, popup scripts, content scripts, and the web
      page.
    * For more information, see [RPC Framework](#rpc-framework)

## Browser Extension Framework

BrowserExtensionFramework is an RPC-centric web extension framework. I originally developed it while working on another
project of mine: <https://github.com/dgroomes/stackoverflow-look-back>.

Here are some key points:

* It supports Manifest V2 APIs only (Manifest V3 APIs are not supported)
* It is useful for injecting JavaScript files into the web page
* It is useful for two-way communication between components. E.g. web-page-to-background, popup-to-background, etc.
* It depends on the RPC framework
* If you do not need to inject JavaScript code into the web page, then you probably don't need this framework.
* This framework only supports injecting one JavaScript file into the web page. This is because of the implementation
  detail around the hardcoded "page-script-satisfied" signal. It could be made dynamic with more complexity but I don't
  need that.

The API is complicated only because the architecture of a web extension can be complicated. Some extensions will use all
JavaScript execution environments: background scripts, popup scripts, content scripts and web page scripts. It's
challenging conceptually to even think about all these environments because we are used to programming in just one
environment like the web page, or maybe a NodeJS app. Plus, writing a program for this environment requires a lot of
message passing code, Promises code and logging (for debugging) code. That's where BrowserExtensionFramework comes in.

However, the framework cannot abstract away the JavaScript execution environments. The user of the API still needs to
know how web extensions work and about each of the JavaScript execution environments. In that sense, this API does not offer
a strong abstraction but rather a *leaky abstraction*. To make up for this, the framework offers block-level API
documentation, design notes and inline code comments. The framework code is meant to be read. Please study it before
using it!

The API is best introduced by way of example. See the README in the [`example/`](example/) directory which contains an
example web extension.

### RPC Framework

A significant portion of a non-trivial browser extension is often dedicated to *Message Passing* between the four components
of an extension: (1) a background script (2) a popup script (3) a content script (4) the web page. Message passing is a
fundamental and useful programming feature, but unfortunately in a browser extension environment the complexity of the code
for message passing is exacerbated by the number of components (the aforementioned four) and the sometimes stark
differences in APIs between browsers (Chromium vs Firefox). It's desirable to encapsulate the complexity of message
passing behind an easy-to-use API that takes a message, does all of the behind the scenes work, and then returns a
response. This description looks like a *Remote Procedure Call* system.

In this codebase, I've implemented a general-purpose Remote Procedure Call (RPC) API for web extensions.

It could be extracted into it's own project. And honestly, it's not a great implementation, but I came to it out of
necessity.

The source code is laid out in a file structure that groups code by the execution context that the code runs in:

* `rpc/rpc.js`
    * The code in this file is foundational common code for the RPC framework. It is used in all contexts of a web
      extension: background scripts, popup scripts, content scripts, and the web page.
* `rpc/rpc-web-page.js`
    * The code in this file runs on the web page.
* `rpc/rpc-backend.js/`
    * The code in this file runs in the extension *backend* contexts: background workers, popups, and content scripts.
* `rpc/content-script.js`
    * The code in this file runs in a content script.

One thing I'm omitting with the RPC implementation is an "absolute unique identifier" to associate with each message.
Without this uniqueness, it's potentially possible to "cross beams" and, for example, have an RPC client process a
message that was not intended for it. I think this is virtually impossible though because we are in a browser
environment where we exercise almost complete control of the environment. By contrast, an RPC system in a distributed
system spanning different networks would need to handle these cases.

#### RPC Framework Usage Instructions

Browser extensions that use the RPC Framework must follow these steps to depend on and initialize the framework in the
extension and web page contexts:

1. Manifest changes
    * Unless you are bundling the RPC code directly into a final `bundle.js`-like file, then you must make these files
      accessible. The `manifest.json` file must allow access to the RPC JavaScript source code files as needed.
      Specifically, `rpc.js`, and `rpc-backend.js` must be added to the background scripts and `rpc.js`
      and `rpc-web-page.js` must be added to the web page.
1. Initialize the content script proxy
    * The initializer function `initializeProxy` in `content-script-middleware.ts` must be executed.
1. Initialize objects in the web page
    * The web page must initialize the RPC objects on the web page by calling `initRpcWebPage(...)`

## Wish List

General clean ups, TODOs and things I wish to implement for this project:

* [ ] Consider publishing to Deno or NPM. Consider publishing the compiled JavaScript.
* [ ] Runtime check the "externally_accessible" configuration list (I assume that's possible but I wouldn't be surprised if
      it wasn't) and warn if the current web page is not in the list. (This was the problem I had when I developed the
      example extension and I was confused). 
* [ ] Fix the double loading problem. This is all over the place. It double loads the source code when you click the
      extension browser action. It makes for an unusable experience except in the very narrow happy path.
* [ ] The "init" functions `initRpcBackground` and `initRpcWebPage` should be encapsulated in the `BackendWiring` and `PageWiring`
      apis right?
* [ ] Update the overall instructions. Especially since I started bundling the source code files into a "bundle" (because we're
      compiling TypeScript into 'entrypoint'-like files), the instructions have gotten stale. Also the whole 'RPC sub-framework'
      isn't really clear anymore.
* [ ] Only use import-maps for convenience `/` root imports instead of relative imports. Stop using import maps for differentiating
      between Chromium/Firefox things. When it comes to publishing this library, I don't want to publish a FireFox artifact
      separately from a Chromium one. Node tooling is not equipped for consuming multi-flavor artifacts.
* [ ] Debugging in FireFox is broken for me on my mac. I can't get it to show logs or sources, even when I try an official
      extension example like 'beastify'. It does not work like the [Extension workshop docs](https://extensionworkshop.com/documentation/develop/debugging/#debugging-popups)
      say it should. I need to try on my Windows computer.
* [ ] Remove Deno for NPM and Webpack. It was a rewarding experience and a quick start. But I need to understand a build
      a prototypical library and user/developer experience. There are so many quirks of browser-based JS modules that I
      can't afford to stray from mainstream.

Finished items:

* [x] DONE Add an example web extension
* [x] DONE re-organize the directory layout. There's no need for a "browser-extension-framework/" directory. Too
  verbose.
* [X] DONE Consider abstracting away the required content script "thin bootstrap" files. For example, `dcl-content-script.ts`
  shouldn't have to exist. I thought it did earlier, but it's not needed. It can be replaced with a generic middleware
  content script.
* [x] DONE Support FireFox in the example. If the example supports both Chromium and FireFox, then I can build it, verify the
  behavior in both browsers, and have confidence that the framework still works.
* [x] DONE Are [import maps](https://deno.land/manual@v1.21.0/linking_to_external_code/import_maps) going to save me from the
  awkward "installation-time" setter of the "browser descriptor? (e.g. 'chrome' of 'firefox')" and can it also be
  used for much more? Can I (should I) bundle only the Chromium-specific classes in the Chrome bundle? Also, this
  frees the architecture to not even use a class-oriented design. There's no need for dynamic dispatch if we can just
  get "vendor-specific dispatch" at build-time.
* [x] DONE Extract the `api/` components into TypeScript interfaces so that the total amount of code presented to end-users
  is as small as feasible. By contrast, presenting the whole `backend-wiring.ts` file to end-users is too much. The
  public functions are `BackendWiring.initialize` and `BackendWiring.injectInstrumentedPageScript`. I don't want
  end-users to have to see the function bodies when browsing the API. Maybe move the implementation details into an
  `impl/` or `wiring/` directory (it doesn't really matter where).

## Reference

* [Chrome extension docs: Manifest V2 Getting started](https://developer.chrome.com/docs/extensions/mv2/getstarted/)
* [Chrome extension docs: chrome.browserAction](https://developer.chrome.com/docs/extensions/reference/browserAction/)
* [Chrome extension docs: "externally_connectable"](https://developer.chrome.com/docs/extensions/mv3/manifest/externally_connectable/)
* [MDN Web Docs: Manifest property "externally_connectable"](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable)
    * The `externally_connectable` is not supported in Firefox. An alternative must be used for message passing between
      the web page and the extension.
      See <https://github.com/mdn/webextensions-examples/tree/master/page-to-extension-messaging>.
