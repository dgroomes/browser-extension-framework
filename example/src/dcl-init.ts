// Core extension initialization code
//
// Is this script even needed? Cant' all the work be done in the popup script?

import {initRpcBackground} from "../../rpc-framework/rpc-backend.ts";
import {chrome} from "../../web-extension-types/chrome-extension-types.d.ts";

console.debug("[dcl-init.js] Loaded.");

chrome.runtime.onInstalled.addListener(async () => {
    await initRpcBackground("chromium");
    console.debug("[dcl-init.js] 'onInstalled' initialization finished.");
})
