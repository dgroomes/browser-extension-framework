import {BrowserExtensionFramework} from "@dgroomes/browser-extension-framework";

console.debug("[dcl-page-script.js] Initializing...");
const pageWiring = BrowserExtensionFramework.initializePageWiring();

pageWiring.rpcServer.registerPromiseProcedure("detect", detectCodeLibraries);

function detectCodeLibraries() : Promise<string> {
    console.log("[dcl-page-script.js] The 'detect' procedure was called.");

    const detected: string[] = [];

    if ((window as any).jQuery !== undefined) {
        console.log("[dcl-page-script.js] jQuery is detected.");
        detected.push("jQuery");
    }

    if ((window as any).__VUE__ !== undefined) {
        // There are a few ways to detect Vue. The Vue devtools features three specific approaches. Read the source
        // code: https://github.com/vuejs/devtools/blob/da62deffcc374e5a7cb5e8a57c088857a24d4737/packages/shell-chrome/src/detector.js#L14
        console.log("[dcl-page-script.js] Vue is detected.");
        detected.push("Vue");
    }

    if ((window as any)._ !== undefined) {
        console.log("[dcl-page-script.js] Lodash is detected.");
        detected.push("Lodash");
    }

    return Promise.resolve(detected.join());
}

pageWiring.satisfied();

console.log("[dcl-page-script.ts] Initialized.");
