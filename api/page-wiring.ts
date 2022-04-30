import {RpcClient, RpcServer} from "../rpc/rpc.ts";
import {PageWiringImpl} from "../impl/page-wiring-impl.ts";

export {PageWiring}

/**
 * The PageWiring class is part of the BrowserExtensionFramework's public API. It must be used in code that runs in the
 * web page.
 *
 * It encapsulates the functionality and configuration (i.e. "wiring") that power the framework in the web page.
 *
 * Use the "initialize" method to get up and running.
 *
 * This class would be used to instrument the "dcl-page-script.js" file as described in the "Detect Code Libraries"
 * example in the README.
 */
abstract class PageWiring {

    rpcClient: RpcClient
    rpcServer: RpcServer

    constructor(rpcClient: RpcClient, rpcServer: RpcServer) {
        this.rpcClient = rpcClient;
        this.rpcServer = rpcServer;
    }

    static initialize(): PageWiring {
        return PageWiringImpl.initialize()
    }

    /**
     * This function must be invoked when any initialization logic is finished. By calling this function, the
     * "page-script-satisfied" signal is sent to the backend components of BrowserExtensionFramework.
     */
    abstract satisfied(): void
}
