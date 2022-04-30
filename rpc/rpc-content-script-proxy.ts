// This code is designed to run in a content script.
//
// This proxies messages between the JavaScript execution environments that require message-passing to communicate with
// each other. Remember, a browser extension architecture is made up of a combination of these JavaScript execution
// environments: web pages, background scripts, content scripts and extension popup pages.

/**
 * Connect web page RPC clients to background RPC servers.
 *
 * Listen for "RPC request" messages on the window and forward them to an RPC server via the extension messaging system.
 * Wait for a return value and then broadcast it to the window as another message. The web page should be expecting this
 * message.
 *
 * This is only needed for Firefox. Chromium browsers, by contrast, give the web page special access to the extension
 * messaging API thanks to the "externally_connectable" Manifest field.
 */
export function webPageRpcClientsListener({data}) {
    console.debug(`[rpc-content-script-proxy] Received a message on the 'window'. Here is the 'data':`)
    console.debug(JSON.stringify({data}, null, 2))

    // If the message is not an RPC message then return immediately to ignore the message. We can tell if a message
    // is an RPC message by looking for the existence of the field "procedureTargetReceiver".
    //
    // If the message is destined for a different receiver, then return immediately to ignore this message.
    //
    // If the message contains a return value, then the request must be part of the "Background RPC client to web page
    // RPC server flow". Return immediately to ignore this message.
    if (data.procedureTargetReceiver !== "rpc-content-script-proxy" || (typeof data.procedureReturnValue !== "undefined")) return

    const {procedureName, procedureArgs} = data

    // Send the message to the background script, and register a handler that forwards the response to the web page.
    const messageToMessagingSystem = {
        procedureTargetReceiver: "background-server",
        procedureName,
        procedureArgs
    }
    console.debug("[rpc-content-script-proxy] Sending an RPC request message to the extension messaging system:")
    console.debug(JSON.stringify(messageToMessagingSystem, null, 2))
    chrome.runtime.sendMessage(null,
        messageToMessagingSystem,
        null,
        function (procedureReturnValue) {
            console.debug(`[rpc-content-script-proxy] Got a response via callback from the extension messaging system:`)
            console.debug({procedureReturnValue})

            // While technically not necessary, I've found this error handling and logging useful. While developing the
            // RPC framework, I frequently get an "undefined" here and so the nicer logging makes for a less frustrating
            // development experience.
            if (typeof procedureReturnValue === "undefined") {
                const errorMsg = `[rpc-content-script-proxy] Something went wrong. This is likely a programmer error. Got an 'undefined' return value from the extension messaging system for an RPC request for '${procedureName}'.`

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
            postMessage(messageToWindow, "*")
        })
}

/**
 * Connect background RPC clients to web page RPC servers.
 *
 * Listen for "RPC request" messages from the extension messaging system and forward them to an RPC server on the web
 * page via a window message. Then, if requested, set up another window listener to listen for the eventual return value
 * of the RPC request from the web page. Forward this to the original background RPC client.
 */
export function backgroundRpcClientsListener(message, _sender, sendResponse) {
    console.debug("[rpc-content-script-proxy] Received a message via the extension messaging system:")
    console.debug(JSON.stringify({message}, null, 2))

    if (message.procedureTargetReceiver !== "rpc-content-script-proxy") return false

    let listenerReturnValue = false

    const {procedureName, procedureArgs, procedureCaptureReturnValue} = message

    if (procedureCaptureReturnValue) {
        addEventListener("message", function captureReturnValueListener({data}) {
            console.debug("[rpc-content-script-proxy] The return value listener received a message via the extension messaging system:")
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
            if (data.procedureTargetReceiver !== "rpc-content-script-proxy" || (typeof procedureReturnValue === "undefined") || data.procedureName !== procedureName) return

            console.debug(`[rpc-content-script-proxy] Got the return value for the RPC request for procedure '${data.procedureName}'`)
            console.debug(JSON.stringify(data, null, 2))
            sendResponse(procedureReturnValue)

            removeEventListener("message", captureReturnValueListener)
        })
        listenerReturnValue = true // Returning "true" tells Firefox that we plan to invoke the "sendResponse" function later (rather, asynchronously). Otherwise, the "sendResponse" function would become invalid.
    }

    console.debug("[rpc-content-script-proxy] Broadcasting the RPC request to the window so that it may be received by the web page:")
    const messageOutgoing = {
        procedureTargetReceiver: "web-page-server",
        procedureName,
        procedureArgs
    }
    console.debug(JSON.stringify(messageOutgoing, null, 2))
    postMessage(messageOutgoing, "*")
    console.debug(`[rpc-content-script-proxy] Returning '${JSON.stringify(listenerReturnValue)}'`)
    return listenerReturnValue
}
