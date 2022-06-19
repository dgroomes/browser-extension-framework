import {BackendWiringImpl} from "./impl/backend-wiring-impl";
import {BackendWiring} from "./backend-wiring";
import {PageWiringImpl} from "./impl/page-wiring-impl";
import {PageWiring} from "./page-wiring";

export enum BrowserDescriptor {
    CHROMIUM,
    FIREFOX
}

/**
 * This is the entry point into BrowserExtensionFramework. You should use the static "initialize" functions to wire the
 * framework into your own browser extension.
 */
export class BrowserExtensionFramework {

    static initializeBackendWiring(browserDescriptor: BrowserDescriptor): Promise<BackendWiring> {
        return BackendWiringImpl.initialize(browserDescriptor)
    }

    static initializePageWiring(): PageWiring {
        return PageWiringImpl.initialize()
    }
}
