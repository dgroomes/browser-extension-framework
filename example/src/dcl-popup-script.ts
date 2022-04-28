import {BackendWiring} from "@bfe/backend-wiring";

console.debug("[dcl-popup-script.js] Initializing...")

document.getElementById("execute-detect")!
    .addEventListener("click", async () => {
        console.info(`[dcl-popup-script.js] Clicked the 'Detect' button`);

        const backendWiring = await BackendWiring.initialize();
        await backendWiring.injectInstrumentedPageScript("dcl-page-script.js")

        const response = await backendWiring.rpcClient.execRemoteProcedure("detect", {});
        console.info(`[dcl-popup-script.js] Response to 'detect': ${response}`);
        alert(`Detected the following libraries: ${response}`);
    });
