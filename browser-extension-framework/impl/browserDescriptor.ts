// Describe the browser type (either Chromium or Firefox)
// This is global state.

import {BrowserDescriptor} from "../api/browser-extension-framework";

let _browserDescriptor: BrowserDescriptor | null = null

export function getBrowserDescriptor(): BrowserDescriptor {
    if (_browserDescriptor !== null) return _browserDescriptor
    throw new Error("The browser descriptor has not been set. It is an error to request the browser descriptor without first setting it. Use the 'setBrowserDescriptor(...)' function to set the browser descriptor")
}

export function setBrowserDescriptor(browserDescriptor: BrowserDescriptor) {
    if (_browserDescriptor !== null) throw Error(`The browser descriptor was previously set to '${browserDescriptor}'. It is an error to set it a second time.`)
    _browserDescriptor = browserDescriptor
}
