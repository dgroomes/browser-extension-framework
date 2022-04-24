// Core extension initialization code
//
// Is this script even needed? Can't all the work be done in the popup script?

import {initRpcBackground} from "../../../rpc/rpc-backend.ts";
import {chrome} from "../../../vendor-extension-types/chrome-extension-types.d.ts";

console.debug("[dcl-init.js] Loaded.");

chrome.runtime.onInstalled.addListener(async () => {
    await initRpcBackground("chromium");
    console.debug("[dcl-init.js] 'onInstalled' initialization finished.");
})
