import {injectInstrumentedPageScript} from "../../web-extension-framework/content-script-wiring.ts";

let pageScript = "dcl-page-script.js";
injectInstrumentedPageScript(pageScript)
    .then(() => console.debug(`[dcl-content-script.js] Successfully injected ${pageScript}!`));
