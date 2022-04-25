// This code is designed to run in background scripts.

import {chrome, Tab} from "../vendor-extension-types/chrome-extension-types.d.ts"
import {browser} from "../vendor-extension-types/firefox-extension-types.d.ts"
import {RpcClient, RpcServer} from "./rpc.ts"

export {initRpcBackground, getRpcServer, getRpcClient}

/**
 * Initialize the configuration for the RPC framework. This must always be executed before any other work is done.
 *
 * @param browserDescriptor either "chromium" or "firefox"
 * @return {Promise} a promise that returns when the initialization work is done.
 */
function initRpcBackground(browserDescriptor) {
    return setBrowserDescriptor(browserDescriptor)
}

let _rpcServer: RpcServer

/**
 * Instantiate a background RPC server.
 */
async function getRpcServer() : Promise<RpcServer> {
    if (_rpcServer instanceof RpcServer) return _rpcServer

    const browserDescriptor = await getBrowserDescriptor()

    if (browserDescriptor === "chromium") {
        _rpcServer = new ChromiumBackgroundRpcServer()
    } else if (browserDescriptor === "firefox") {
        _rpcServer = new FirefoxBackgroundRpcServer()
    } else {
        throw new Error(`Unexpected browser: '${browserDescriptor}'. Expected either 'chromium' or 'firefox'`)
    }

    return _rpcServer
}

let _rpcClient : RpcClient

// Cache a copy of the browserDescriptor. The value of the browser descriptor will never change because of course the
// browser can't change. If we are in Firefox, then we are Firefox. The browser descriptor will always be "firefox" so
// we might as well cache the value.
let _browserDescriptor = null

/**
 * Get the browser descriptor from storage.
 *
 * @return {Promise<String>} the browser descriptor. The value is either "chromium" of "firefox"
 */
function getBrowserDescriptor() {
    if (_browserDescriptor !== null) return _browserDescriptor
    return new Promise((resolve, reject) => {
        // deno-lint-ignore no-explicit-any
        chrome.storage.local.get<any>("rpcBrowserDescriptor", (found) => {
            console.log(`[rpc-backend.js] Found rpcBrowserDescriptor: ${JSON.stringify(found, null, 2)}`)
            _browserDescriptor = found.rpcBrowserDescriptor
            if (typeof _browserDescriptor === "undefined") {
                reject()
                const msg = "[rpc-backend.js] 'rpcBrowserDescriptor' not found. The RPC framework must not have been initialized. Call the 'init(...)' function first."
                console.error(msg)
                throw Error(msg)
            }
            resolve(_browserDescriptor)
        })
    })
}

/**
 * Set the browser descriptor to storage
 *
 * @param {String} browserDescriptor
 * @return {Promise} a promise that resolves when the value has been saved.
 */
function setBrowserDescriptor(browserDescriptor) {
    _browserDescriptor = browserDescriptor
    return new Promise(resolve => {
        chrome.storage.local.set({
            rpcBrowserDescriptor: browserDescriptor
        }, () => {
            resolve("success_ignored_value")
        })
    })
}

/**
 * Instantiate a background RPC client instance to make requests to the web page.
 *
 * It's necessary to find the active browser tab.
 *
 * @return {RpcClient}
 */
async function getRpcClient() : Promise<RpcClient> {
    if (_rpcClient instanceof RpcClient) return _rpcClient

    const activeTab: Tab = await new Promise(resolve => {
        chrome.tabs.query({active: true}, tabs => {
            const activeTab = tabs[0] // The "query" function returns an array of results, but when searching for the "active" tab there of course can only be one. It is the first element in the array.
            resolve(activeTab)
        })
    })

    const browserDescriptor = await getBrowserDescriptor()

    if (browserDescriptor === "chromium") {
        _rpcClient = new ChromiumBackgroundToContentScriptRpcClient(activeTab.id)
    } else if (browserDescriptor === "firefox") {
        _rpcClient = new FirefoxBackgroundToContentScriptRpcClient(activeTab.id)
    } else {
        throw new Error(`Unexpected browser: '${browserDescriptor}'. Expected either 'chromium' or 'firefox'`)
    }

    return _rpcClient
}

/**
 * This is a concrete implementation of RpcServer for Chromium browsers that runs in a background script and services
 * RPC requests.
 */
class ChromiumBackgroundRpcServer extends RpcServer {

    constructor() {
        super("background-server")
    }

    listen() {
        chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
            if (!this.intake(message)) {
                return
            }

            this.dispatch(message).then(returnValue => {
                sendResponse(returnValue)
            })
        })
    }
}

/**
 * This is a concrete implementation of RpcServer for Firefox that runs in a background script and services RPC requests.
 */
class FirefoxBackgroundRpcServer extends RpcServer {

    constructor() {
        super("background-server")
    }

    listen() {
        browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (!this.intake(message)) {
                return false
            }

            this.dispatch(message).then(returnValue => {
                sendResponse(returnValue)
            })
            return true // Returning "true" tells Firefox that we plan to invoke the "sendResponse" function later (rather, asynchronously). Otherwise, the "sendResponse" function would become invalid.
        })
    }
}

/**
 * An implementation of the RpcClient interface for Chromium that runs in a background script and sends RPC requests to
 * a content script RPC proxy which then forwards the requests to an RPC server in the web page. Finally, the web page
 * sends a return value to the background.
 */
class ChromiumBackgroundToContentScriptRpcClient extends RpcClient {

    readonly #tabId

    constructor(tabId) {
        super("content-script-rpc-proxy")
        this.#tabId = tabId
    }

    async execRemoteProcedure<T,R>(procedureName, procedureArgs: T): Promise<R> {
        const rpcRequest = this.createRequest(procedureName, procedureArgs)

        const responsePromise = new Promise<R>(resolve => {
            console.debug(`[ChromiumBackgroundToContentScriptRpcClient] Registering listener on the messaging system to listen for RPC return value...`)
            chrome.runtime.onMessageExternal.addListener(function returnValueListener(message) {
                console.debug(`[ChromiumBackgroundToContentScriptRpcClient] Received message:`)
                console.debug(JSON.stringify({message}, null, 2))
                if (message.procedureTargetReceiver === "background-client") {
                    resolve(message.procedureReturnValue)
                    chrome.runtime.onMessageExternal.removeListener(returnValueListener)
                }
            })
        })

        await chrome.tabs.sendMessage(this.#tabId, rpcRequest)
        return await responsePromise
    }
}

/**
 * An implementation of the RpcClient interface for Firefox that runs in a background script and sends RPC requests to
 * a content script RPC proxy which then forwards the requests to an RPC server in the web page.
 */
class FirefoxBackgroundToContentScriptRpcClient extends RpcClient {

    readonly #tabId

    constructor(tabId: number) {
        super("content-script-rpc-proxy")
        this.#tabId = tabId
    }

    async execRemoteProcedure<T,R>(procedureName, procedureArgs: T): Promise<R> {
        const rpcRequest = this.createRequest(procedureName, procedureArgs)
        rpcRequest.procedureCaptureReturnValue = true
        return await browser.tabs.sendMessage(this.#tabId, rpcRequest)
    }
}
