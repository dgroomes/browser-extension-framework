// Core extension initialization code

import {initRpcBackground} from "../../../rpc/rpc-backend.ts";
import {browser} from "../../../vendor-extension-types/firefox-extension-types.d.ts";

console.debug("[dcl-init.js] Loaded.");

browser.runtime.onInstalled.addListener(async () => {
    await initRpcBackground("firefox");
    console.debug("[dcl-init.js] 'onInstalled' initialization finished.");
})
