// This is a component of BrowserExtensionFramework.

import {initRpcWebPage} from "../rpc/rpc-web-page.ts";
import {RpcClient, RpcServer} from "../rpc/rpc.ts";

export {PageWiring}

interface ContextInfo {
    browserDescriptor: string
    webExtensionId: string
    webResourcesOrigin: string
}

/**
 * The PageWiring class is the BrowserExtensionFramework API to code than runs on the web page or in a popup script.
 *
 * This class should not be used from content scripts or background scripts.

 * This class would be used to instrument the "dcl-page-script.js" file as described in the "Detect Code Libraries"
 * example in the README.
 */
class PageWiring {

    rpcClient: RpcClient
    rpcServer: RpcServer
    browserDescriptor: string
    webExtensionId: string // The origin that serves the web resources like the JavaScript files. This origin will be a special Chromium/Firefox extension URL.
    webResourcesOrigin: string

    constructor(rpcClient: RpcClient, rpcServer: RpcServer, browserDescriptor: string, webExtensionId: string, webResourcesOrigin: string) {
        this.rpcClient = rpcClient;
        this.rpcServer = rpcServer;
        this.browserDescriptor = browserDescriptor;
        this.webExtensionId = webExtensionId;
        this.webResourcesOrigin = webResourcesOrigin;
    }

    static initialize() : PageWiring {
        const {browserDescriptor, webExtensionId, webResourcesOrigin} = detectEnvironment()

        const [rpcClient, rpcServer] = initRpcWebPage(browserDescriptor, webExtensionId)

        return new PageWiring(
            rpcClient,
            rpcServer,
            browserDescriptor,
            webExtensionId,
            webResourcesOrigin)
    }

    /**
     * This function must be invoked when any initialization logic is finished. By calling this function, the
     * "page-script-satisfied" signal is sent to the backend components of BrowserExtensionFramework.
     */
    satisfied(): void {
        console.log("[page-wiring.js] Satisfied. The web page RPC server will start listening now.")
        this.rpcServer.listen()
        window.postMessage("page-script-satisfied", "*");
    }
}

/**
 * Detect the current environment and assign the following global properties:
 *   - browserDescriptor
 *   - extensionContext
 *   - webResourcesOrigin
 *   - webExtensionId
 */
function detectEnvironment(): ContextInfo {

    const info: any = {}

    /**
     * Detect information based on the extension URL.
     *
     * From the examples below, notice how the legal characters include lowercase letters, numbers and the hyphen
     * character.
     *
     * @param url. For example:
     *               - chrome-extension://akidegfimbjmokpejlcnjagogamdiinl/some-page.html
     *               - moz-extension://df0b610b-995b-9240-8c3b-fcaf155c9005/some-code.js
     */
    function detectFromExtensionUrl(url) {
        const regex = new RegExp("(chrome-extension|moz-extension)://([a-z0-9-]+)")
        const matches = regex.exec(url)!
        info.webResourcesOrigin = matches[0]

        const host = matches[1]
        if (host === "chrome-extension")
            info.browserDescriptor = "chromium"
        else if (host === "moz-extension") {
            info.browserDescriptor = "firefox"
        } else {
            throw new Error(`Unrecognized host name: '${host}', Expected either 'chrome-extension' or 'moz-extension'`)
        }

        info.webExtensionId = matches[2]
    }

    if (window.origin.startsWith("chrome-extension://") || window.origin.startsWith("moz-extension://")) {
        detectFromExtensionUrl(window.origin)
        return info
    }

    const script = document.getElementById("browser-extension-framework-injected-page-script") as HTMLScriptElement
    detectFromExtensionUrl(script.src)
    return info
}
