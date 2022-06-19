// This code is designed to run in background scripts.

import {RpcClient, RpcServer} from "./rpc"
import {getBrowserDescriptor} from "../impl/browserDescriptor";
import {BrowserDescriptor} from "../browser-descriptor";

export {getRpcServer, getRpcClient}

let _rpcServer: RpcServer

/**
 * Instantiate a background RPC server.
 */
function getRpcServer() : RpcServer {
    if (_rpcServer instanceof RpcServer) return _rpcServer

    const browserDescriptor: BrowserDescriptor = getBrowserDescriptor();
    if (browserDescriptor === BrowserDescriptor.CHROMIUM) {
        _rpcServer = new ChromiumBackgroundRpcServer()
    } else if (browserDescriptor === BrowserDescriptor.FIREFOX) {
        _rpcServer = new FirefoxBackgroundRpcServer()
    } else {
        throw new Error(`Unexpected browser: '${browserDescriptor}'. Expected either 'chromium' or 'firefox'`)
    }

    return _rpcServer
}

let _rpcClient : RpcClient

/**
 * Instantiate a background RPC client instance to make requests to the web page.
 *
 * It's necessary to find the active browser tab.
 *
 * @return {RpcClient}
 */
async function getRpcClient() {
    if (_rpcClient instanceof RpcClient) return _rpcClient

    const activeTab: Tab = await new Promise(resolve => {
        chrome.tabs.query({active: true}, tabs => {
            const activeTab = tabs[0] // The "query" function returns an array of results, but when searching for the "active" tab there of course can only be one. It is the first element in the array.
            resolve(activeTab)
        })
    })

    const browserDescriptor = getBrowserDescriptor();
    if (browserDescriptor === BrowserDescriptor.CHROMIUM) {
        _rpcClient = new ChromiumBackgroundToContentScriptRpcClient(activeTab.id)
    } else if (browserDescriptor === BrowserDescriptor.FIREFOX) {
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

    readonly #tabId: number

    constructor(tabId: number) {
        super("rpc-content-script-proxy")
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

    readonly #tabId: number

    constructor(tabId: number) {
        super("rpc-content-script-proxy")
        this.#tabId = tabId
    }

    async execRemoteProcedure<T,R>(procedureName, procedureArgs: T): Promise<R> {
        const rpcRequest = this.createRequest(procedureName, procedureArgs)
        rpcRequest.procedureCaptureReturnValue = true
        return await browser.tabs.sendMessage(this.#tabId, rpcRequest)
    }
}
