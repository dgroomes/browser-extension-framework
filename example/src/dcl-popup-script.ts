import {BackendWiring} from "../../wiring/backend-wiring.ts";

console.debug("[dcl-popup-script.js] Initializing...")

document.getElementById("execute-detect")!
    .addEventListener("click", async () => {
        console.info(`[dcl-popup-script.js] Clicked the 'Say hello' button`);

        const backendWiring = await BackendWiring.initialize();

        const pageScript = "dcl-page-script.js";
        await backendWiring.injectInstrumentedPageScript(pageScript)
        console.debug(`[dcl-content-script.js] Successfully injected ${pageScript}!`);


        const response = await backendWiring.rpcClient.execRemoteProcedure("detect", {});
        console.info(`[dcl-popup-script.js] Response to 'detect': ${response}`);
        alert(`Detected the following libraries: ${response}`);
    });
