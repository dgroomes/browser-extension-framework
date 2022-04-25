// This code is designed to run in a content script. This is *not* part of the public API for BrowserExtensionFramework.
//
// This is middleware for BrowserExtensionFramework. Middleware is a good description for this code because content
// scripts often metaphorically sit in-between background scripts and the page scripts. Rather they sit "in the middle".
// This middleware mainly exists to proxy RPC request/response message but it also services requests from the framework
// "backend wiring" to inject the web page with a page script.

import {chrome} from "vendor-extension-types/chrome-extension-types.d.ts";

export {injectInstrumentedPageScript}

// Define a global "window" variable that we can use to keep track of the lifecycle.
declare global {
    interface Window {
        injectInstrumentedPageScript_status: string
        contentScriptMiddlewareInitialized: boolean
    }
}

/**
 * Initialize the messaging middleware.
 *
 * 1) Messages will be received from the web extension APIs (i.e. 'chrome.runtime.onMessage')
 * 2) Messages will be received from the web page (i.e. 'window.addEventListener')
 *
 * Protect against double-loading the middleware machinery if it's already been loaded by using global flags like
 * 'contentScriptMiddlewareInitialized'
 */
if (window.contentScriptMiddlewareInitialized === undefined) {
    console.debug("[content-script-middleware.js] Loading...")
    window.contentScriptMiddlewareInitialized = true
    addEventListener("message", listenToWindowEvents)
    chrome.runtime.onMessage.addListener(listenToWebExtensionApiMessages)
    chrome.runtime.onMessage.addListener(pageScriptInjectionRequestListener)
} else {
    console.debug("[content-script-middleware.js] Already loaded.")
}

/**
 * Listen for "RPC request" or "page script lifecycle" messages on the window.
 *
 * This function connects web page RPC clients to background RPC servers.
 */
function listenToWindowEvents({data}) {
    console.debug(`[content-script-middleware.js] Received a message on the 'window'. Here is the 'data':`)
    console.debug(JSON.stringify({data}, null, 2))

    // If the message is not an RPC message then return immediately to ignore the message. We can tell if a message
    // is an RPC message by looking for the existence of the field "procedureTargetReceiver".
    //
    // If the message is destined for a different receiver, then return immediately to ignore this message.
    //
    // If the message contains a return value, then the request must be part of the "Background RPC client to web page
    // RPC server flow". Return immediately to ignore this message.
    if (data.procedureTargetReceiver !== "content-script-rpc-proxy" || (typeof data.procedureReturnValue !== "undefined")) return

    const {procedureName, procedureArgs} = data

    // Send the message to the background script, and register a handler that forwards the response to the web page.
    const messageToMessagingSystem = {
        procedureTargetReceiver: "background-server",
        procedureName,
        procedureArgs
    }
    console.debug("[content-script-middleware.js] Sending an RPC request message to the extension messaging system:")
    console.debug(JSON.stringify(messageToMessagingSystem, null, 2))
    chrome.runtime.sendMessage(null,
        messageToMessagingSystem,
        null,
        function (procedureReturnValue) {
            console.debug(`[content-script-middleware.js] Got a response via callback from the extension messaging system:`)
            console.debug({procedureReturnValue})

            // While technically not necessary, I've found this error handling and logging useful. While developing the
            // RPC framework, I frequently get an "undefined" here and so the nicer logging makes for a less frustrating
            // development experience.
            if (typeof procedureReturnValue === "undefined") {
                const errorMsg = `[content-script-middleware.js] Something went wrong. This is likely a programmer error. Got an 'undefined' return value from the extension messaging system for an RPC request for '${procedureName}'.`

                // It is not enough to just throw the error on the next line. The error actually gets silently swallowed
                // by the browser's extension framework and you will never see the error in the logs. Instead we
                // manually log an error message to the console.
                console.error(errorMsg)
                throw new Error(errorMsg)
            }

            // Finally, send the return value to the window so that it may be received by the web page
            const messageToWindow = {
                procedureTargetReceiver: "web-page-client",
                procedureName,
                procedureReturnValue
            }
            window.postMessage(messageToWindow, "*")
        })
}

/**
 * Listen for "RPC request" or "page script lifecycle" messages from the extension messaging system.
 *
 * The function connects background RPC clients to web page RPC servers.
 */
function listenToWebExtensionApiMessages(message, _sender, sendResponse) {
    console.debug("[content-script-middleware.js] Received a message via the extension messaging system:")
    console.debug(JSON.stringify({message}, null, 2))

    if (message.procedureTargetReceiver !== "content-script-rpc-proxy") return false

    let listenerReturnValue = false

    const {procedureName, procedureArgs, procedureCaptureReturnValue} = message

    if (procedureName === "inject-page-script") {
        if (!('fileName' in procedureArgs)) {
            console.error("[content-script-middleware.js] Expected to find the procedure arg 'fileName' but did not");
            return;
        }

        const pageScriptFileName = procedureArgs.fileName;

        await injectInstrumentedPageScript(pageScriptFileName);
        console.debug(`[content-script-middleware.js] Successfully injected ${pageScriptFileName}!`);
    }

    if (procedureCaptureReturnValue) {
        window.addEventListener("message", function captureReturnValueListener({data}) {
            console.debug("[content-script-middleware.js] The return value listener received a message via the extension messaging system:")
            console.debug(JSON.stringify({data}, null, 2))
            const {procedureReturnValue} = data

            // If the message is not an RPC message then return immediately to ignore the message. We can tell if a message
            // is an RPC message by looking for the existence of the field "procedureTargetReceiver".
            //
            // If the message is destined for a different receiver, then return immediately to ignore this message.
            //
            // If the message does not contain a return value, then the request must be part of the "Web page RPC client
            // to background RPC server flow". Return immediately to ignore this message.
            //
            // If the message does not match the expected procedure name, then this message is destined for a different
            // listener. Return immediately to ignore this message.
            if (data.procedureTargetReceiver !== "content-script-rpc-proxy" || (typeof procedureReturnValue === "undefined") || data.procedureName !== procedureName) return

            console.debug(`[content-script-middleware.js] Got the return value for the RPC request for procedure '${data.procedureName}'`)
            console.debug(JSON.stringify(data, null, 2))
            sendResponse(procedureReturnValue)

            window.removeEventListener("message", captureReturnValueListener)
        })
        listenerReturnValue = true // Returning "true" tells Firefox that we plan to invoke the "sendResponse" function later (rather, asynchronously). Otherwise, the "sendResponse" function would become invalid.
    }




    console.debug("[content-script-middleware.js] Broadcasting the RPC request to the window so that it may be received by the web page:")
    const messageOutgoing = {
        procedureTargetReceiver: "web-page-server",
        procedureName,
        procedureArgs
    }
    console.debug(JSON.stringify(messageOutgoing, null, 2))
    window.postMessage(messageOutgoing, "*")
    console.debug(`[content-script-middleware.js] Returning '${JSON.stringify(listenerReturnValue)}'`)
    return listenerReturnValue
}

/**
 * Listen for "page script injection" requests from the framework backend.
 *
 * Specifically, listens for messages described as "inject-page-script" from the extension messaging system.
 */
async function pageScriptInjectionRequestListener(message, _sender, _sendResponse) {



    const {procedureName, procedureArgs} = message




}

/**
 * Inject a framework-instrumented JavaScript file into the web page.
 *
 * This function should be called from a content script.
 *
 * The description "framework-instrumented" means that the JavaScript file being injected must include lifecycle code
 * from the BrowserExtensionFramework. It is up to the programmer to ensure that the given JavaScript file is properly
 * instrumented. If you inject code that doesn't respect the lifecycle, then the returned Promise will never resolve.
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
        console.debug("[content-script-wiring.js] Injecting an instrumented page script...")
        window.injectInstrumentedPageScript_status = "in-progress";
    } else if (window.injectInstrumentedPageScript_status === "in-progress") {
        console.error("[content-script-wiring.js] Already loaded.");
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
            console.debug(`[content-script-wiring.js] Received a message on the 'window'. Here is the 'data':`);
            console.debug(JSON.stringify({data}, null, 2));
            if (data === "page-script-satisfied") {
                console.debug("[content-script-wiring.js] Sending the 'page-script-satisfied' message");
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
