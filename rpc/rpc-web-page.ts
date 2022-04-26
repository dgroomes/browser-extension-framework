// This code is designed to run on the web page.
// This is a component of the RPC framework.

import {chrome} from "../vendor/chrome-extension-types.d.ts"
import {RpcClient, RpcServer} from "./rpc.ts"

export {initRpcWebPage}

// Define a global "window" variable that we can use to keep track of the lifecycle.
declare global {
    interface Window {
        initRpcWebPage_status: string
    }
}

/**
 *  Initialize the web page objects of the RPC framework. Programs that depend on the RPC framework must call this
 *  function.
 *
 *  The window will be initialized with instances of RpcClient and RpcServer on the global variables "rpcClient" and
 *  "rpcServer" respectively.
 *
 *  @param browserDescriptor either "chromium" or "firefox" are supported
 *  @param webExtensionId
 */
function initRpcWebPage(browserDescriptor, webExtensionId) : [RpcClient, RpcServer] {
    if (window.initRpcWebPage_status === undefined) {
        console.debug("[rpc-web-page.js] Initializing...")
        window.initRpcWebPage_status = "in-progress";
    } else if (window.initRpcWebPage_status === "in-progress") {
        const msg = `[rpc-web-page.ts] The RPC framework initialization on the web page is already 'in-progress'. This is undefined behavior.`;
        console.error(msg);
        throw new Error(msg)
    } else if (window.initRpcWebPage_status === "initialized") {
        const msg = `[rpc-web-page.ts] The RPC framework was already initialized on the web page. It is not allowed to initialize it again.`;
        console.error(msg)
        throw new Error(msg)
    }

    if (browserDescriptor === "chromium") {
        const rpcClient = new ChromiumWebPageToBackgroundRpcClient(webExtensionId);
        const rpcServer = new ChromiumWebPageRpcServer(webExtensionId);
        return [rpcClient, rpcServer];
    } else if (browserDescriptor === "firefox") {
        const rpcClient = new FirefoxWebPageToContentScriptRpcClient(webExtensionId);
        const rpcServer = new FirefoxWebPageRpcServer();
        return [rpcClient, rpcServer];
    } else {
        throw new Error(`Unexpected browser: '${browserDescriptor}'. Expected either 'chromium' or 'firefox'`)
    }
}

/**
 * This is a concrete implementation of RpcServer for Chromium that runs in the web page and services RPC requests.
 */
class ChromiumWebPageRpcServer extends RpcServer {

    readonly #webExtensionId

    constructor(webExtensionId) {
        super("web-page-server")
        this.#webExtensionId = webExtensionId
    }

    listen() {
        addEventListener("message", ({data}) => {
            if (!this.intake(data)) {
                return false
            }

            const {procedureName} = data

            this.dispatch(data).then(procedureReturnValue => {
                // Send the procedure return value to the RPC client (it's assumed that the client is in a background
                // script or popup script).
                const returnMessage = {
                    procedureTargetReceiver: "background-client",
                    procedureName,
                    procedureReturnValue
                }
                console.debug(`[ChromiumWebPageRpcServer] sending message:`)
                console.debug(JSON.stringify(returnMessage, null, 2))
                chrome.runtime.sendMessage(this.#webExtensionId, returnMessage)
            })
        })
    }
}

/**
 * This is a concrete implementation of RpcServer for Firefox that runs in the web page and services RPC requests.
 */
class FirefoxWebPageRpcServer extends RpcServer {

    constructor() {
        super("web-page-server")
    }

    listen() {
        addEventListener("message", async ({data}) => {
            if (!this.intake(data)) {
                return false
            }

            const procedureReturnValue = await this.dispatch(data)

            const {procedureName} = data
            // Send the procedure return value to the RPC client by way of the RPC proxy.
            const returnMessage = {
                procedureTargetReceiver: "rpc-content-script-proxy",
                procedureName,
                procedureReturnValue
            }
            console.debug(`[FirefoxWebPageRpcServer] sending message:`)
            console.debug(JSON.stringify(returnMessage, null, 2))
            postMessage(returnMessage, undefined)
        })
    }
}

/**
 * An implementation of the RpcClient interface for Chromium browsers that runs in the web page and sends RPC requests
 * to an RPC server in a background script.
 */
class ChromiumWebPageToBackgroundRpcClient extends RpcClient {

    readonly #webExtensionId

    constructor(webExtensionId) {
        super("background-server")
        this.#webExtensionId = webExtensionId
    }

    execRemoteProcedure<T,R>(procedureName, procedureArgs: T) : Promise<R> {
        const rpcRequest = this.createRequest(procedureName, procedureArgs)
        return new Promise<R>((resolve) => {
            chrome.runtime.sendMessage(this.#webExtensionId, rpcRequest,
                function (returnValue) {
                    console.debug("[ChromiumWebPageToBackgroundRpcClient] Got a return value from the remote procedure call:")
                    console.debug({returnValue})
                    resolve(returnValue)
                })
        })
    }
}

/**
 * An implementation of the RpcClient for Firefox that runs in the web page and sends RPC requests to a content script
 * RPC gateway which then forwards the requests to an RPC server in a background script.
 *
 * It will initiate remote procedure calls by passing messages to the Firefox content-script and then to the extension
 * background scripts. Unfortunately, Firefox does not support direct page-to-background communication because it does
 * not support the "externally_connectable" Manifest field. So we must resort to page-to-contentscript-to-background
 * communication. This is a significant difference between Chromium and Firefox and it is worth encapsulating the
 * implementation details in this class.
 */
class FirefoxWebPageToContentScriptRpcClient extends RpcClient {

    #webExtensionId

    constructor(webExtensionId) {
        super("rpc-content-script-proxy")
        this.#webExtensionId = webExtensionId
    }

    /**
     * This function uses the asynchronous broadcast messaging system of the "window" object plus Firefox's "runtime.sendMessage"
     * extension API to make a one-for-one request/response procedure call. Honestly, the implementation seems a little
     * strange but it makes for a great API to the calling code. I think this is an effective pattern.
     *
     * This function will send a message to the RPC content script proxy and then
     * register a listener on the window to listen for the eventual expected response message.
     */
    execRemoteProcedure<T,R>(procedureName, procedureArgs: T) : Promise<R> {
        // I'm assuming it's wise to wire up the event listener before posting the message to avoid a race condition.
        // That's why I've put this before the "window.postMessage". But I don't think it actually matters.
        const returnValuePromise = new Promise<R>((resolve => {
            addEventListener("message", function listenForRpcResponse({data}) {
                if (data.procedureTargetReceiver === "web-page-client"
                    && data.procedureName === procedureName) {

                    removeEventListener("message", listenForRpcResponse)
                    resolve(data.procedureReturnValue)
                }
            })
        }))

        const rpcRequest = this.createRequest(procedureName, procedureArgs)
        postMessage(rpcRequest, "*")

        return returnValuePromise
    }
}

