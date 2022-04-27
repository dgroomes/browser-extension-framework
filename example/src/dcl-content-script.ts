import {injectInstrumentedPageScript, initializeProxy} from "@bfe/content-script-middleware";

const pageScript = "dcl-page-script.js";
initializeProxy()
injectInstrumentedPageScript(pageScript)
    .then(() => console.debug(`[dcl-content-script.js] Successfully injected ${pageScript}!`));
