import {PageWiring} from "../../web-extension-framework/page-wiring.ts";

console.debug("[dcl-page-script.js] Initializing...");
const pageWiring = PageWiring.initialize();

pageWiring.rpcServer.registerPromiseProcedure("say-hello", (_procedureArgs) => {
    console.log("[dcl-page-script.js] Hello!");
    alert("Hello world!");
    return Promise.resolve("Hello from the page script!");
});

pageWiring.satisfied();
console.log("[dcl-page-script.ts] Initialized.");
