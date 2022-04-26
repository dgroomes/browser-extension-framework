// This code is designed to run in a content script.
//
// This is middleware for BrowserExtensionFramework. Middleware is a good description for this code because content
// scripts often metaphorically sit in-between background scripts and page scripts. Rather they sit "in the middle".
//
// This middleware mainly exists to proxy RPC request/response message but it also services requests from the framework
// "backend wiring" to inject the web page with a page script.

import {chrome} from "../vendor/chrome-extension-types.d.ts";
import {backgroundRpcClientsListener, webPageRpcClientsListener} from "../rpc/rpc-content-script-proxy.ts";

export {injectInstrumentedPageScript}

// Define a global "window" variable that we can use to keep track of the lifecycle.
declare global {
    interface Window {
        injectInstrumentedPageScript_status: string
        rpcContentScriptProxyInitialized: boolean
    }
}

/**
 * Initialize the proxy.
 *
 * 1) Messages will be received from the web extension APIs (i.e. 'chrome.runtime.onMessage')
 * 2) Messages will be received from the web page (i.e. 'window.addEventListener')
 *
 * Protect against double-loading the middleware machinery if it's already been loaded by using global flags like
 * 'contentScriptMiddlewareInitialized'
 */
export function initializeProxy() {
    // Protect against double-initializing the proxy machinery by using a global flags
    if (window.rpcContentScriptProxyInitialized === undefined) {
        console.debug("[rpc-content-script-proxy] Loading...")
        window.rpcContentScriptProxyInitialized = true
        globalThis.addEventListener("message", webPageRpcClientsListener)
        chrome.runtime.onMessage.addListener(backgroundRpcClientsListener)
    } else {
        console.debug("[rpc-content-script-proxy] Already loaded.")
    }
}

/**
 * Inject a framework-instrumented JavaScript file into the web page.
 *
 * This function should be called from a content script.
 *
 * The description "framework-instrumented" means that the JavaScript file being injected must include lifecycle code
 * from the BrowserExtensionFramework. It is up to the programmer to ensure that the given JavaScript file is properly
 * instrumented. If you inject non-instrumented, then the returned Promise will never resolve.
 *
 * This function would be used to inject the "dcl-page-script.js" file as described in the "Detect Code Libraries"
 * example in the README.
 *
 * @param fileName the name of a JavaScript file which must include framework-instrumented code
 *
 * @return a promise that resolves after the script has loaded and when it has signalled it is "satisfied"
 */
function injectInstrumentedPageScript(fileName: string): Promise<void> {
    if (window.injectInstrumentedPageScript_status === undefined) {
        console.debug("[content-script-middleware] Injecting an instrumented page script...")
        window.injectInstrumentedPageScript_status = "in-progress";
    } else if (window.injectInstrumentedPageScript_status === "in-progress") {
        console.error("[content-script-middleware] Already loaded.");
        throw new Error(`[content-script-functions.ts] The injection is in 'in-progress'. This is undefined behavior.`)
    } else if (window.injectInstrumentedPageScript_status === "satisfied") {
        // If the page script had previously been loaded and signaled "page-script-satisfied", then we can do the
        // idempotent thing and re-broadcast the "page-script-satisfied" signal back to the background or popup script.

        // todo should this use the RPC client to send the message?
        chrome.runtime.sendMessage(null, "page-script-satisfied");
        return Promise.resolve();
    }

    // Set up a window listener that waits for the "page-script-satisfied" signal from the web page.
    //
    // It's important that this listener be created before the page script is injected. If the listener is created
    // after the page script is injected then there is a race condition where the page script might complete and send
    // the "page-script-satisfied" message before the listener is ever created. In that case, the listener was too late.
    // In practice, I think that would never happen. But for the sake of avoiding ambiguity, the implementation order
    // is helpful.
    const pageScriptSatisfied = new Promise<void>(resolve => {
        addEventListener("message", function webPageInitializedListener({data}) {
            console.debug(`[content-script-middleware] Received a message on the 'window'. Here is the 'data':`);
            console.debug(JSON.stringify({data}, null, 2));
            if (data === "page-script-satisfied") {
                console.debug("[content-script-middleware] Sending the 'page-script-satisfied' message");
                chrome.runtime.sendMessage(null, "page-script-satisfied");

                resolve();
                removeEventListener("message", webPageInitializedListener);
            }
        });
    });

    // Inject the page script
    const scriptEl = document.createElement("script");
    scriptEl.src = chrome.runtime.getURL(fileName);
    scriptEl.id = "browser-extension-framework-injected-page-script";
    document.head.append(scriptEl);

    return pageScriptSatisfied;
}
