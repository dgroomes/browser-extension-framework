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

    constructor(rpcClient: RpcClient, rpcServer: RpcServer) {
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
    static async initialize() : Promise<BackendWiring> {
        const rpcClient = await getRpcClient();
        const rpcServer = await getRpcServer();

        // Load the content-script-middleware. There should probably be more code in 'initialize' that actually waits
        // for and asserts that the middleware was successfully initialized. This would be a good pre-condition. So many
        // things can go wrong. It's like a mini-distributed system.
        await execContentScript("/content-script-middleware.js")

        const backendWiring = new BackendWiring(rpcClient, rpcServer);
        backendWiring.rpcServer.listen()
        console.log("[backend-wiring.js] The backend RPC server is listening for requests.")
        return backendWiring;
    }

    /**
     * WORK IN PROGRESS.
     *
     * Inject a page script. Under the hood, this function sends an "inject-page-script" message to the content script
     * middleware, and waits for the "initialization acknowledgement" of the page script. This comes in the form of a
     * message called "page-script-satisfied".
     *
     * This function would be used to inject the "dcl-page-script.js" file as described in the "Detect Code Libraries"
     * example in the README.
     *
     * @return a promise that resolves when the related page script has been loaded and has given the "page-script-satisfied"
     * signal.
     */
    async injectPageScript(fileName) : Promise<void> {
        console.debug(`[backend-wiring.js] Injecting page script (by way of the content script middleware): ${fileName}`)
        await this.rpcClient.execRemoteProcedure("inject-page-script", { "fileName": fileName })
        console.debug("[backend-wiring.js] The page script was injected.")
    }
}

/**
 * Execute a content script.
 *
 * @param fileName the file name of the content script
 * @return a promise that resolves when the content script has been loaded/executed(?)
 */
function execContentScript(fileName: string) : Promise<void> {
    console.debug(`[backend-wiring.js] Executing content script: ${fileName}`)
    return new Promise(resolve => {
        chrome.tabs.executeScript({
            file: fileName
        }, () => {
            resolve(undefined)
        })
    })
}
