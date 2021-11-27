// This code runs in the popup. It bootstraps the content scripts which then bootstrap the web page. It waits for user
// input when any of the "Scrape votes", "Expand posts", or "View posts" buttons are clicked in the popup.

import {BackendWiring} from "../../web-extension-framework/backend-wiring.ts";

console.debug("[dcl-popup.js] Initializing...")

document.getElementById("execute-say-hello")!
    .addEventListener("click", async () => {
        console.info(`[dcl-popup.js] Clicked the 'Say hello' button`);

        const backendWiring = await BackendWiring.initialize("/dcl-content-script.js");
        await backendWiring.satisfied();

        const response = backendWiring.rpcClient.execRemoteProcedure("say-hello", {});
        console.info(`[dcl-popup.js] Response to 'say-hello': ${response}`);
    });
