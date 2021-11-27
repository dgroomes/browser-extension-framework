// Type declarations for the Chrome web extension JavaScript API.

export {Chrome, Runtime, chrome, Tab}

declare var chrome: Chrome

interface Chrome {
    declarativeContent: DeclarativeContent;
    runtime: Runtime
    storage: Storage
    tabs: Tabs
}

/** The "chrome.runtime" API https://developer.chrome.com/docs/extensions/reference/runtime/ */
interface Runtime {

    /** https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage */
    sendMessage(
        extensionId: string | null,
        message: any,
        options: object | null,
        responseCallback: Function | null
    ): void


    sendMessage(
        extensionId: string | null,
        message: any,
        options?: object
    ): void

    /** https://developer.chrome.com/docs/extensions/reference/runtime/#method-getURL */
    getURL(url: string): string

    /** https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage */
    onMessage: Event

    /** https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled */
    onInstalled: Event

    /** https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessageExternal */
    onMessageExternal: Event
}

/**
 * The "chrome.storage" API https://developer.chrome.com/docs/extensions/reference/storage/
 */
interface Storage {
    local: StorageArea
}

/**
 * https://developer.chrome.com/docs/extensions/reference/storage/#type-StorageArea
 */
interface StorageArea {
    get(key: string): Promise<any>

    get(key: string, callback: (found: any) => void): Promise<any>

    set(items: any): Promise<any>

    set(items: any, callback: () => void): Promise<any>
}

/**
 * https://developer.chrome.com/docs/extensions/reference/runtime/#event
 */
interface Event {

    addListener(callback: Function): void

    /**
     * This method isn't documented in https://developer.chrome.com/docs/extensions/reference/runtime/ but the method
     * exists.
     */
    removeListener(fn: any): void
}

/**
 * https://developer.chrome.com/docs/extensions/reference/tabs/
 */
interface Tabs {
    /** https://developer.chrome.com/docs/extensions/reference/tabs/#method-executeScript */
    executeScript(
        details: InjectDetails,
        callback?: () => void
    ): void

    /** https://developer.chrome.com/docs/extensions/reference/tabs/#method-create */
    create(createProperties: {
        url: string
    }): void

    /** https://developer.chrome.com/docs/extensions/reference/tabs/#method-query */
    query(queryInfo: { active: boolean }, callback: (tabs: Array<Tab>) => void): void;

    /** https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage */
    sendMessage(tabId, message: any): void
}

/** https://developer.chrome.com/docs/extensions/reference/tabs/#type-Tab */
interface Tab {
    id : number
}

/**
 * https://developer.chrome.com/docs/extensions/reference/extensionTypes/#type-InjectDetails
 */
interface InjectDetails {
    file: string
}

/**
 * https://developer.chrome.com/docs/extensions/reference/declarativeContent/
 */
interface DeclarativeContent {
    onPageChanged: DeclarativeEvent

    /** I don't know how to declare an inner interface (like an inner class) */
    PageStateMatcher: any
    ShowPageAction: any
}

/**
 * https://developer.chrome.com/docs/extensions/reference/events/#type-Event
 */
interface DeclarativeEvent {

    removeRules(ruleIdentifiers: Array<string> | undefined,
                callback: Function): void;

    addRules(rules: Array<Rule>): void;
}

/**
 * https://developer.chrome.com/docs/extensions/reference/events/#type-Rule
 */
interface Rule {
    conditions: Array<any>
    actions: Array<any>
}
