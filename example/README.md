# example

NOT YET FULLY IMPLEMENTED (only a 'hello world' has been implemented)

This is an example browser extension that uses WebExtensionFramework.

## "Detect Code Libraries"

This example browser extension is called *Detect Code Libraries* (DCL). It uses WebExtensionFramework and adds code to
the web page to detect what JavaScript libraries are loaded. For example, it can detect jQuery, React, Vue, Lodash, etc.
The "detected libraries" data is sent from the web page to
a [popup](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Popups)
script and shown in a popup dialog. It's implemented as a Chrome extension but it should work easily on other Chromium
browsers with minimal changes.

Now, consider how the detection feature must be implemented. JavaScript must be injected into the web page so that it
may look for global variables like `jQuery` and `React`. Injecting JavaScript code into the web page can only be done
from a content script. And injecting a content script must be done from a background or popup script! Phew, that's a lot
of JavaScript execution environments. Keep in mind these components:

1) The DCL popup script
    * `dcl-popup-script.js`
2) The DCL content script
    * `dcl-content-script.js`
3) The DCL web page script
    * `dcl-page-script.js`

The programmer must write each of these files. It is not possible for WebExtensionFramework to abstract away
`dcl-content-script.js` or `dcl-page-script.js`. Abstracting away those files would require dynamic JavaScript,
serializing/deserializing JavaScript code, and using `eval()`, which we are not willing to do.

So, the API of WebExtensionFramework requires the programmer to still write all of these files but offers functions to
reduce the boilerplate and handle message passing and lifecycle timing.

## Instructions

Follow these instructions to install the tool as a Chrome browser extension and use it:

1. Install Deno
    * <https://deno.land>
    * > A modern runtime for JavaScript and TypeScript.
1. Build the extension distribution:
    * `./build.sh`
1. Open Chrome's extension settings page
    * Open Chrome to the URL: `chrome://extensions`
1. Enable developer mode
    * Enable the *Developer mode* toggle control in the upper right corner of the page
1. Install the extension
    * Click the *Load unpacked* button
    * In the file finder window that opens, find the extension distribution directory `distribution/`, single click it
      to highlight it, and click the *Select* button.
    * It's installed!
1. Open the browser to any website
1. Detect code libraries
    * Open the extensions menu by pressing the puzzle icon in the top right of the window
    * Click the "detect-code-libraries" extension entry
    * A popup will show up with a "Say hello" button. Click it. You should see a "Hello world!" alert!

## Reference

* [Chrome extension docs: Manifest V2 Getting started](https://developer.chrome.com/docs/extensions/mv2/getstarted/)
* [Chrome extension docs: chrome.browserAction](https://developer.chrome.com/docs/extensions/reference/browserAction/)
