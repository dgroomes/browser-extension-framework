import {chrome} from "../vendor-extension-types/chrome-extension-types.d.ts"
import {RpcClient, RpcServer} from "../rpc/rpc.ts";
import {getRpcClient, getRpcServer} from "../rpc/rpc-backend.ts";
export {BackendWiring}

/**
 * The BackendWiring class is the BrowserExtensionFramework API for code that runs in backend contexts like a background
 * script or a popup.
 */
class BackendWiring {

    rpcClient: RpcClient
    rpcServer: RpcServer
    #contentScriptFileName : string

    constructor(contentScriptFileName: string, rpcClient: RpcClient, rpcServer: RpcServer) {
        this.#contentScriptFileName = contentScriptFileName;
        this.rpcClient = rpcClient;
        this.rpcServer = rpcServer;
    }

    /**
     * Initialize the backend components of BrowserExtensionFramework.
     *
     * - Initializes the lower-level RPC framework
     * - Create an RPC server in the background script that will receive remote procedure call (RPC) requests from the front-end
     *   and then executes those requests.
     */
    static async initialize(contentScriptFileName: string) : Promise<BackendWiring> {
        await execContentScript("/rpc/rpc-content-script.js")
        await execContentScript("/content-script-middleware.js")
        const rpcClient = await getRpcClient();
        const rpcServer = await getRpcServer();
        return new BackendWiring(contentScriptFileName, rpcClient, rpcServer);
    }

    /**
     * This function must be invoked when any initialization logic is finished.
     *
     * Calling this function triggers the initialization of the content-script and web page components.
     *
     * @return promise The promise resolves when the "page-script-satisfied" signal has been confirmed.
     */
    async satisfied(): Promise<void> {
        console.log("[backend-wiring.js] Satisfied. The backend RPC server will start listening now and the frontend components will be loaded.")
        this.rpcServer.listen()
        await executeInstrumentedContentScript(this.#contentScriptFileName)
    }
}

/**
 * Execute a "web-page-bootstrapping content script JavaScript file" as a content script.
 *
 * This function must be called from a background or popup script.
 *
 * This function would be used to execute the "dcl-content-script.js" file as described in the "Detect Code Libraries"
 * example in the README.
 *
 * @return a promise that resolves when the related page script has been loaded and has given the "page-script-satisfied"
 * signal.
 */
async function executeInstrumentedContentScript(fileName) : Promise<void> {
    console.debug(`[backend-wiring.js] Executing content script: ${fileName}`)

    // Set up a messaging system listener that waits for the "page-script-satisfied" signal.
    //
    // It's important that this listener be created before the execution of the content script (which implies that it is
    // also before the injection of the page script). If the listener is created after the content script starts
    // executing, then there is a race condition where the content script and page script might complete and send the
    // "page-script-satisfied" signal before the listener is even created. In that case, the listener was too late.
    const pageScriptSatisfied: Promise<void> = new Promise<void>(resolve => {
        console.debug(`[backend-wiring.js] [${Date.now()}] Registering listener for 'page-script-satisfied'`)
        chrome.runtime.onMessage.addListener(function pageScriptSatisfiedListener(message, _sender, _sendResponse) {
            console.debug("[backend-wiring.js] Received a message from the extension messaging system:")
            console.debug(JSON.stringify({message}, null, 2))
            if (message === "page-script-satisfied") {
                console.debug(`[backend-wiring.js] Detected that the page script has been loaded into the web page and is satisfied`)
                resolve(undefined)
                chrome.runtime.onMessage.removeListener(pageScriptSatisfiedListener)
            }
        })
    })

    // Send a "inject-page-script" request which will be handled by the middleware.
    // todo should this wait for the response? That might be a more error-message-friendly implementation.
    chrome.tabs.executeScript({file: fileName})

    await pageScriptSatisfied
}

/**
 * Execute a content script.
 *
 * @param fileName the file name of the content script
 * @return a promise that resolves when the content script has been loaded/executed(?)
 */
async function execContentScript(fileName: string) : Promise<void> {
    console.debug(`[backend-wiring.js] Executing content script: ${fileName}`)
    return new Promise(resolve => {
        chrome.tabs.executeScript({
            file: fileName
        }, () => {
            resolve(undefined)
        })
    })
}
