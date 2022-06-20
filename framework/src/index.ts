export {BrowserDescriptor} from "./browser-descriptor"
export * from "./backend-wiring"
export * from "./page-wiring"
export {RpcClient, RpcServer, RpcRequestMessage} from "./rpc/rpc"

import {BackendWiringImpl} from "./impl/backend-wiring-impl";
import {BackendWiring} from "./backend-wiring";
import {PageWiringImpl} from "./impl/page-wiring-impl";
import {PageWiring} from "./page-wiring";
import {BrowserDescriptor} from "./browser-descriptor";

/**
 * This is the entry point into BrowserExtensionFramework from a "backend context".
 */
export function initializeBackendWiring(browserDescriptor: BrowserDescriptor): Promise<BackendWiring> {
    return BackendWiringImpl.initialize(browserDescriptor)
}

/**
 * This is the entry point into BrowserExtensionFramework from a "web page context".
 */
export function initializePageWiring(): PageWiring {
    return PageWiringImpl.initialize()
}
