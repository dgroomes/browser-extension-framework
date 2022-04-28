// This code is designed to run in a content script.
//
// This is middleware for BrowserExtensionFramework. Middleware is a good description for this code because content
// scripts often metaphorically sit in-between background scripts and page scripts. Rather they sit "in the middle".
//
// This middleware mainly exists to proxy RPC request/response message but it also services requests from the framework
// "backend wiring" to inject the web page with a page script.

import {chrome} from "/vendor/chrome-extension-types.d.ts";
import {backgroundRpcClientsListener, webPageRpcClientsListener} from "/rpc/rpc-content-script-proxy.ts";

// Define a global "window" variable that we can use to keep track of the lifecycle.
declare global {
    interface Window {
        injectInstrumentedPageScript_status: string
        contentScriptMiddlewareInitialized: boolean
    }
}

initialize()

/**
 * Initialize the middleware.
 *
 * This initializes the proxy, the page-script injection listener, and finally sends the 'content-script-middleware-satisfied'
 * signal.
 *
 * Messages will be received from the web extension APIs (i.e. 'chrome.runtime.onMessage') and proxied to the web page.
 * Messages will be received from the web page (i.e. 'window.addEventListener') and proxied to the backend.
 */
function initialize() {
    // Protect against double-initializing the proxy machinery by using a global flag
    if (window.contentScriptMiddlewareInitialized === undefined) {
        console.debug("[content-script-middleware] Loading...")
        window.contentScriptMiddlewareInitialized = true
        globalThis.addEventListener("message", webPageRpcClientsListener)
        chrome.runtime.onMessage.addListener(backgroundRpcClientsListener)
        chrome.runtime.onMessage.addListener(pageScriptInjectionRequestsListener)
    } else {
        console.debug("[content-script-middleware] Already loaded.")
    }

    // In either case, do the idempotent thing and send the 'content-script-middleware-satisfied' message.
    console.debug("[content-script-middleware] Sending the 'content-script-middleware-satisfied' signal")
    chrome.runtime.sendMessage(null, "content-script-middleware-satisfied");
}

async function pageScriptInjectionRequestsListener(message, _sender, _sendResponse) {
    console.debug("[content-script-middleware] Received a message via the extension messaging system:")
    console.debug(JSON.stringify({message}, null, 2))

    if (typeof message !== "object") {
        console.debug("[content-script-middleware] Message was not an 'object'. Returning.")
        return
    }

    if (message["procedureTargetReceiver"] !== "content-script-middleware") {
        console.debug("[content-script-middleware] The 'procedureTargetReceiver' was not 'content-script-middleware'. Returning.")
        return
    }

    if (message["procedureName"] !== "inject-page-script") {
        console.debug("[content-script-middleware] The 'procedureName' was not 'inject-page-script'. Returning.")
        return
    }

    const procedureArgs = message["procedureArgs"]
    if (typeof procedureArgs !== "object") {
        console.error("[content-script-middleware] Expected to find the 'procedureArgs' field is a list but it was not. This is an error. Returning.")
        return
    }

    const fileName = procedureArgs["fileName"]

    if (typeof fileName !== "string" || fileName.length === 0) {
        console.error("[content-script-middleware] Found an 'inject-page-script' request but the 'fileName' argument was missing. Returning.")
        return
    }

    await injectInstrumentedPageScript(fileName)
}


/**
 * Inject a framework-instrumented JavaScript file into the web page.
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
 * @return a promise that resolves after the script has loaded and when it has signalled it is "satisfied". The function
 *         also broadcasts a 'page-injection-complete' message so that the calling backend code knows the procedure is done.
 */
function injectInstrumentedPageScript(fileName: string): Promise<void> {
    if (window.injectInstrumentedPageScript_status === undefined) {
        console.debug(`[content-script-middleware] Injecting an instrumented page script '${fileName}' ...`)
        window.injectInstrumentedPageScript_status = "in-progress";
    } else if (window.injectInstrumentedPageScript_status === "in-progress") {
        const msg = "[content-script-middleware] A page script injection procedure is already in progress. It is an error to begin a second injection procedure at the same time.";
        console.error(msg)
        throw new Error(msg)
    } else if (window.injectInstrumentedPageScript_status === "satisfied") {
        // If the page script had previously been loaded and signaled "page-script-satisfied", then we can do the
        // idempotent thing and re-broadcast the "page-script-satisfied" signal back to the background or popup script.
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
        addEventListener("message", function pageScriptSatisfiedListener({data}) {
            console.debug(`[content-script-middleware] Received a message on the 'window'. Here is the 'data':`);
            console.debug(JSON.stringify({data}, null, 2));
            if (data === "page-script-satisfied") {
                console.debug("[content-script-middleware] Found the 'page-script-satisfied' message on the window. Sending a 'page-injection-complete' message to the extension messaging system.");
                chrome.runtime.sendMessage(null, "page-injection-complete");

                resolve();
                removeEventListener("message", pageScriptSatisfiedListener);
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
