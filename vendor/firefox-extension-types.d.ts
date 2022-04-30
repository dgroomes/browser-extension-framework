// Type declarations for Firefox and the Firefox web extension JavaScript API.
//
// See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API

declare namespace browser {
    let tabs: Tabs
    let runtime: Runtime
}

/** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime */
interface Runtime {

    /** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage */
    onMessage: Event;

    /** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled */
    onInstalled: any
}

interface Event {
    addListener(callback: Function): void
}

/** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs */
interface Tabs {

    /** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage */
    sendMessage(tabId, message: any): Promise<any>
}
