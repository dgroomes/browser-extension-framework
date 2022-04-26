import {injectInstrumentedPageScript, initializeProxy} from "../../api/content-script-middleware.ts";

const pageScript = "dcl-page-script.js";
initializeProxy()
injectInstrumentedPageScript(pageScript)
    .then(() => console.debug(`[dcl-content-script.js] Successfully injected ${pageScript}!`));
