import {PageWiring} from "../../web-extension-framework/page-wiring.ts";

console.debug("[dcl-page-script.js] Initializing...");
const pageWiring = PageWiring.initialize();

pageWiring.rpcServer.registerPromiseProcedure("detect", (_procedureArgs) => {
    console.log("[dcl-page-script.js] The 'detect' procedure was called.");

    const detected : string[] = [];

    if ((window as any).jQuery !== undefined) {
        console.log("[dcl-page-script.js] jQuery is detected.");
        detected.push("jQuery");
    }

    if ((window as any).Vue !== undefined) {
        console.log("[dcl-page-script.js] Vue is detected.");
        detected.push("Vue");
    }

    if ((window as any)._ !== undefined) {
        console.log("[dcl-page-script.js] Lodash is detected.");
        detected.push("Lodash");
    }

    return Promise.resolve(detected.join());
});

pageWiring.satisfied();
console.log("[dcl-page-script.ts] Initialized.");
