// deno-lint-ignore-file no-explicit-any

export {browser}

/** FireFox web extension docs and the "browser" global variable: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API */
declare var browser: FireFox

interface FireFox {
    tabs: Tabs
    runtime: Runtime
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
