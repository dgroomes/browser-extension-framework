import {initRpcWebPage} from "../rpc/rpc-web-page";
import {RpcClient, RpcServer} from "../rpc/rpc";
import {PageWiring} from "../page-wiring";

export {PageWiringImpl}

interface ContextInfo {
    browserDescriptor: string
    webExtensionId: string
    webResourcesOrigin: string
}

class PageWiringImpl extends PageWiring {

    browserDescriptor: string
    webExtensionId: string // The origin that serves the web resources like the JavaScript files. This origin will be a special Chromium/Firefox extension URL.
    webResourcesOrigin: string

    constructor(rpcClient: RpcClient, rpcServer: RpcServer, browserDescriptor: string, webExtensionId: string, webResourcesOrigin: string) {
        super(rpcClient, rpcServer)
        this.browserDescriptor = browserDescriptor;
        this.webExtensionId = webExtensionId;
        this.webResourcesOrigin = webResourcesOrigin;
    }

    static initialize() : PageWiring {
        const {browserDescriptor, webExtensionId, webResourcesOrigin} = detectEnvironment()

        const [rpcClient, rpcServer] = initRpcWebPage(browserDescriptor, webExtensionId)

        return new PageWiringImpl(
            rpcClient,
            rpcServer,
            browserDescriptor,
            webExtensionId,
            webResourcesOrigin)
    }

    satisfied(): void {
        console.log("[page-wiring.js] Satisfied. The web page RPC server will start listening now.")
        this.rpcServer.listen()
        postMessage("page-script-satisfied", "*");
    }
}

/**
 * Detect the current environment.
 */
function detectEnvironment(): ContextInfo {

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
    function detectFromExtensionUrl(url) : ContextInfo {
        const regex = new RegExp("(chrome-extension|moz-extension)://([a-z0-9-]+)")
        const matches = regex.exec(url)!
        const webResourcesOrigin = matches[0]

        const host = matches[1]
        const browserDescriptor = (() : string => {
            if (host === "chrome-extension")
                return "chromium"
            else if (host === "moz-extension") {
                return "firefox"
            } else {
                throw new Error(`Unrecognized host name: '${host}', Expected either 'chrome-extension' or 'moz-extension'`)
            }
        })()

        const webExtensionId = matches[2]

        return {
            webResourcesOrigin,
            browserDescriptor,
            webExtensionId
        }
    }

    if (origin.startsWith("chrome-extension://") || window.origin.startsWith("moz-extension://")) {
        return detectFromExtensionUrl(origin)
    }

    const script = document.getElementById("browser-extension-framework-injected-page-script") as HTMLScriptElement
    return detectFromExtensionUrl(script.src)
}
