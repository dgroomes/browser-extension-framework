import {RpcClient, RpcServer} from "../rpc/rpc";

/**
 * The PageWiring class is part of the BrowserExtensionFramework's public API. It must be used in code that runs in the
 * web page.
 *
 * It encapsulates the functionality and configuration (i.e. "wiring") that power the framework in the web page.
 *
 * Use the "initialize" method in "BrowserExtensionFramework" to get up and running.
 *
 * This class would be used to instrument the "dcl-page-script.js" file as described in the "Detect Code Libraries"
 * example in the README.
 */
export abstract class PageWiring {

    rpcClient: RpcClient
    rpcServer: RpcServer

    constructor(rpcClient: RpcClient, rpcServer: RpcServer) {
        this.rpcClient = rpcClient;
        this.rpcServer = rpcServer;
    }

    /**
     * This function must be invoked when any initialization logic is finished. By calling this function, the
     * "page-script-satisfied" signal is sent to the backend components of BrowserExtensionFramework.
     */
    abstract satisfied(): void
}
