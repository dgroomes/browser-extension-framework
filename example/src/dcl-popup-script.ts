import {BackendWiring} from "../../api/backend-wiring.ts";

console.debug("[dcl-popup-script.js] Initializing...")

document.getElementById("execute-detect")!
    .addEventListener("click", async () => {
        console.info(`[dcl-popup-script.js] Clicked the 'Say hello' button`);

        const backendWiring = await BackendWiring.initialize("/dcl-content-script.js");
        await backendWiring.satisfied();

        const response = await backendWiring.rpcClient.execRemoteProcedure("detect", {});
        console.info(`[dcl-popup-script.js] Response to 'detect': ${response}`);
        alert(`Detected the following libraries: ${response}`);
    });
