import {BackendWiringImpl} from "../impl/backend-wiring-impl.ts";
import {RpcClient, RpcServer} from "../rpc/rpc.ts";
import {BrowserDescriptor} from "../browserDescriptor.ts";

export {BackendWiring}

/**
 * The BackendWiring class is part of the BrowserExtensionFramework's public API. It must be used in code that runs
 * in backend contexts like a background script or a popup.
 *
 * It encapsulates the functionality and configuration (i.e. "wiring") that power the framework in background or popup
 * scripts.
 *
 * Use the "initialize" method to get up and running.
 *
 * This class would be used by the "dcl-popup-script.ts" file in the "Detect Code Libraries" example project.
 */
abstract class BackendWiring {

    rpcClient: RpcClient
    rpcServer: RpcServer

    protected constructor(rpcClient: RpcClient, rpcServer: RpcServer) {
        this.rpcClient = rpcClient;
        this.rpcServer = rpcServer;
    }

    static initialize(browserDescriptor: BrowserDescriptor) : Promise<BackendWiring> {
        return BackendWiringImpl.initialize(browserDescriptor)
    }

    /**
     * Inject a web-page script. The page script must be instrumented with the BrowserExtensionFramework's "PageWiring"
     * class because the injection flow is expecting the "page-script-satisfied" signal.
     *
     * This function would be used to inject the "dcl-page-script.js" file as described in the "Detect Code Libraries"
     * example project README.
     *
     * @return a promise that resolves when the page script has been loaded and the content script middleware has given
     * the "page-injection-complete" signal.
     */
    abstract injectInstrumentedPageScript(fileName: string): Promise<void>
}

