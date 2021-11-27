# web-extension-framework

🛠 An RPC-centric web extension framework for the browser.

---
**NOTE**: This was developed on macOS and for my own personal use.

---

## Design

The source code layout:

* `web-extension-types/`
    * TypeScript type declaration files for browser (vendor) JavaScript APIs. This means there are `.d.ts` files for
      Chromium's `chrome` JavaScript APIs and FireFox's `browser` JavaScript APIs. Yes there is probably an open source
      version of this but I would prefer to minimize third-party dependencies where feasible (Update: I'm happy to depend
      on first-party libraries from, for example, Mozilla. I think they have a nice polyfill).
* `rpc-framework/`
    * The code in this directory implements a generic Remote Procedure Call (RPC) framework for browser extensions. This
      code has components that run in all contexts: background scripts, popup scripts, content scripts, and the web
      page.
    * For more information, see [RPC Framework](#rpc-framework)
* `web-extension-framework/`
    * The code in this directory implements an RPC-centric web extension framework. It depends on the lower-level
      `rpc-framework`.
    * For more information, see [Web Extension Framework](#web-extension-framework)

## Web Extension Framework

`web-extension-framework/` is an RPC-centric web extension framework. I originally developed it while working on another
project of mine: <https://github.com/dgroomes/stackoverflow-look-back>.

Here are some key points:

* It supports Manifest V2 APIs only (Manifest V3 APIs are not supported)
* It is useful for injecting JavaScript files into the web page
* It is useful for two-way communication between components. E.g. web-page-to-background, popup-to-background, etc.
* It depends on `rpc-framework/`
* If you do not need to inject JavaScript code into the web page, then you probably don't need this framework.
* This framework only supports injecting one JavaScript file into the web page. This is because of the implementation
  detail around the hardcoded "page-script-satisfied" signal. It could be made dynamic with more complexity but I don't
  need that.

The API is complicated only because the architecture of a web extension can be complicated. Some extensions will use all
JavaScript execution environments: background scripts, popup scripts, content scripts and web page scripts. It's
challenging conceptually to even think about all these environments because we are used to programming in just one
environment like the web page, or maybe a NodeJS app. Plus, writing a program for this environment requires a lot of
message passing code, Promises code and logging (for debugging) code. That's where `web-extension-framework/` comes in.

However, the framework cannot abstract away the JavaScript execution environments. The user of the API still needs to
know how web extensions work and about each of the Java execution environments. In that sense, this API does not offer
a strong abstraction but rather a *leaky abstration*. To make up for this, the framework offers block-level API
documentation, design notes and inline code comments. The framework code is meant to be read. Please study it before
using it!

The API is best introduced by way of example. Suppose we are developing a *Detect Code Libraries* (DCL) web extension
using `web-extension-framework/`. This extension adds code to the web page to detect what JavaScript libraries are loaded,
like jQuery, React, Vue, Lodash, etc. The "detected libraries" data is sent from the web page back to the extension
background script and saved into Web Storage where the user can later browse the data. Now, consider how the
detection feature must be implemented. JavaScript must be injected into the web page so that it may look for global
variables like `jQuery` and `React`. Injecting JavaScript code into the web page can only be done from a content script.
And injecting a content script must be done from a background or popup script! Phew, that's a lot of JavaScript execution
environments. Keep in mind these components:

1) The DCL background script
    * `dcl-background-script.js`
2) The DCL content script
    * `dcl-content-script.js`
3) The DCL web page script
    * `dcl-page-script.js`

The programmer must write each of these files. It is not possible for `web-extension-framework` to abstract away
`dcl-content-script.js` or `dcl-page-script.js`. Abstracting away those files would require dynamic JavaScript,
serializing/deserializing JavaScript code, and using `eval()`, which we are not willing to do.

So, the API of `web-extension-framework/` requires the programmer to still write all of these files but offers functions
to reduce the boilerplate and handle message passing and lifecycle timing.

### RPC Framework

A significant portion of a non-trivial web extension is often dedicated to *Message Passing* between the four components
of an extension: (1) a background script (2) a popup script (3) a content script (4) the web page. Message passing is a
fundamental and useful programming feature, but unfortunately in a web extension environment the complexity of the code
for message passing is exacerbated by the number of components (the aforementioned four) and the sometimes stark
differences in APIs between browsers (Chromium vs Firefox). It's desirable to encapsulate the complexity of message
passing behind an easy-to-use API that takes a message, does all of the behind the scenes work, and then returns a
response. This description looks like a *Remote Procedure Call* system.

In this codebase, I've implemented a general-purpose Remote Procedure Call (RPC) API for web extensions.

It could be extracted into it's own project. And honestly, it's not a great implementation, but I came to it out of
necessity.

The source code is laid out in a file structure that groups code by the execution context that the code runs in:

* `rpc-framework/rpc.js`
    * The code in this file is foundational common code for the RPC framework. It is used in all contexts of a web
      extension: background scripts, popup scripts, content scripts, and the web page.
* `rpc-framework/rpc-web-page.js`
    * The code in this file runs on the web page.
* `rpc-framework/rpc-backend.js/`
    * The code in this file runs in the extension *backend* contexts: background workers, popups, and content scripts.
* `rpc-framework/content-script.js`
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
1. Initialize configuration in the background
    * The background script must invoke `initRpcBackground(...)`
1. Load the content scripts
    * The content script `rpc-content-script.js` must be executed.
1. Initialize objects in the web page
    * The web page must initialize the RPC objects on the web page by calling `initRpcWebPage(...)`

## Wish List

General clean ups, TODOs and things I wish to implement for this project:

* [ ] Add an example web extension
