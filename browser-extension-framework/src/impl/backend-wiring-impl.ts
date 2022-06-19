import {RpcClient, RpcServer} from "../rpc/rpc";
import {getRpcClient, getRpcServer} from "../rpc/rpc-backend";
import {BackendWiring} from "../backend-wiring";
import {BrowserDescriptor} from "../browser-extension-framework";
import {getBrowserDescriptor, setBrowserDescriptor} from "./browserDescriptor";

export {BackendWiringImpl}

class BackendWiringImpl extends BackendWiring {

    constructor(rpcClient: RpcClient, rpcServer: RpcServer) {
        super(rpcClient, rpcServer)
    }

    static async initialize(browserDescriptor: BrowserDescriptor): Promise<BackendWiringImpl> {
        setBrowserDescriptor(browserDescriptor)
        const rpcClient = await getRpcClient();
        const rpcServer = getRpcServer();
        await initializeMiddleware()
        rpcServer.listen()
        console.log("[backend-wiring] The backend RPC server is listening for requests.")
        return new BackendWiringImpl(rpcClient, rpcServer);
    }

    async injectInstrumentedPageScript(fileName: string): Promise<void> {
        console.debug(`[backend-wiring] Injecting page script: ${fileName}`)

        // Set up a messaging system listener that waits for the "page-injection-complete" signal.
        //
        // It's important that this listener be created before the page injection request to the content script middleware.
        // If the listener is created after the request is made, then there is a race condition where the injection flow
        // might complete, and the content script middleware sends the "page-injection-complete" signal before the listener
        // is even created. In that case, the listener was too late.
        const pageInjectionComplete: Promise<void> = new Promise<void>(resolve => {
            console.debug(`[backend-wiring] [${Date.now()}] Registering listener for 'page-injection-complete'`)
            chrome.runtime.onMessage.addListener(function pageInjectionCompleteListener(message, _sender, _sendResponse) {
                console.debug("[backend-wiring] Received a message from the extension messaging system:")
                console.debug(JSON.stringify({message}, null, 2))
                if (message === "page-injection-complete") {
                    console.debug(`[backend-wiring] Detected that the page script injection is complete.`)
                    resolve(undefined)
                    chrome.runtime.onMessage.removeListener(pageInjectionCompleteListener)
                }
            })
        })

        const injectPageRequest = {
            procedureTargetReceiver: "content-script-middleware",
            procedureName: "inject-page-script",
            procedureArgs: {
                fileName
            }
        }
        const activeTab: Tab = await new Promise(resolve => {
            chrome.tabs.query({active: true}, tabs => {
                const activeTab = tabs[0] // The "query" function returns an array of results, but when searching for the "active" tab there of course can only be one. It is the first element in the array.
                resolve(activeTab)
            })
        })

        const browserDescriptor = getBrowserDescriptor();
        if (browserDescriptor === BrowserDescriptor.CHROMIUM) {
            chrome.tabs.sendMessage(activeTab.id, injectPageRequest)
            // @ts-ignore the constant value 'browserDescriptor' is import-mapped differently for chromium vs firefox.
        } else if (browserDescriptor === BrowserDescriptor.FIREFOX) {
            await browser.tabs.sendMessage(activeTab.id, injectPageRequest)
        } else {
            throw new Error(`Unrecognized browser descriptor: ${browserDescriptor}`)
        }

        await pageInjectionComplete
    }
}

const MIDDLEWARE_SCRIPT = "/content-script-middleware.js"

/**
 * Initialize the content script middleware.
 *
 * A sub-step of the BackendWiring's own initialization procedure is the initialization of the content script "middleware".
 * This function injects the content script (it should probably protect against double injection, right?) and waits for
 * a special 'content-script-middleware-satisfied' message in the browser extension messaging system.
 *
 * @return a promise that resolves when the middleware has given the 'content-script-middleware-satisfied' signal.
 */
async function initializeMiddleware(): Promise<void> {
    console.debug(`[backend-wiring] Injecting the middleware content script (${MIDDLEWARE_SCRIPT})`)

    // Set up a messaging system listener that waits for the "content-script-middleware-satisfied" signal.
    //
    // It's important that this listener be created before the injection of the content script. If the listener is
    // created after the content script starts executing, then there is a race condition where the content script might
    // complete and send the "content-script-middleware-satisfied" signal before the listener is even created. In that
    // case, the listener was too late.
    const contentScriptMiddlewareSatisfied: Promise<void> = new Promise<void>(resolve => {
        console.debug(`[backend-wiring] [${Date.now()}] Registering listener for 'content-script-middleware-satisfied' signal`)
        chrome.runtime.onMessage.addListener(function contentScriptMiddlewareSatisfiedListener(message, _sender, _sendResponse) {
            console.debug("[backend-wiring] Received a message from the extension messaging system:")
            console.debug(JSON.stringify({message}, null, 2))
            if (message === "content-script-middleware-satisfied") {
                console.debug(`[backend-wiring] Detected that the middleware has been loaded in the content script execution environment.`)
                resolve(undefined)
                chrome.runtime.onMessage.removeListener(contentScriptMiddlewareSatisfiedListener)
            }
        })
    })

    await new Promise(resolve => {
        chrome.tabs.executeScript({
            file: MIDDLEWARE_SCRIPT
        }, () => {
            resolve(undefined)
        })
    })

    return contentScriptMiddlewareSatisfied
}

