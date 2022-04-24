# example

This is an example browser extension that uses BrowserExtensionFramework.


## "Detect Code Libraries"

This example browser extension is called *Detect Code Libraries* (DCL). It uses BrowserExtensionFramework and adds code to
the web page to detect what JavaScript libraries are loaded. It tries to detect if jQuery, Vue or Lodash is loaded.
(This is a limited list, but this is just a contrived browser extension example!).

The "detected libraries" data is sent from the web page to
a [popup](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Popups)
script and shown in a system alert dialog. It's implemented as a Chrome extension but it should work on other Chromium
browsers with minimal changes.

Now, consider how the detection feature must be implemented. JavaScript must be injected into the web page so that it
may look for global variables like `jQuery` or `Vue`. Injecting JavaScript code into the web page can only be done
from a content script. And injecting a content script must be done from a background or popup script! Phew, that's a lot
of JavaScript execution environments. Keep in mind these components:

1) The DCL popup script
    * `dcl-popup-script.js`
2) The DCL content script
    * `dcl-content-script.js`
3) The DCL web page script
    * `dcl-page-script.js`

The programmer must write each of these files. It is not possible for BrowserExtensionFramework to abstract away
`dcl-content-script.js` or `dcl-page-script.js`. Abstracting away those files would require dynamic JavaScript,
serializing/deserializing JavaScript code, and using `eval()`, which we are not willing to do.

So, the API of BrowserExtensionFramework requires the programmer to still write all of these files but offers functions to
reduce the boilerplate and handle message passing and lifecycle timing.


## Instructions

Follow these instructions to install the tool as a Chrome browser extension and use it:

1. Install Deno
    * <https://deno.land>
    * > A modern runtime for JavaScript and TypeScript.
1. Build the extension distribution:
    * `./build.sh`
    * This will take 20+ seconds. Deno is working hard to type check the TypeScript code.
1. Open Chrome's extension settings page
    * Open Chrome to the URL: `chrome://extensions`
    * Alternatively, follow the instructions in the [Firefox](#firefox) section below to install the extension in
      Firefox.
1. Enable developer mode
    * Enable the *Developer mode* toggle control in the upper right corner of the page
1. Install the extension
    * Click the *Load unpacked* button
    * In the file finder window that opens, find the extension distribution directory `distribution/chromium-manifest-v2`,
      single click it to highlight it, and click the *Select* button.
    * It's installed!
1. Open the browser to <https://en.wikipedia.org/wiki/Main_Page>
1. Detect code libraries
    * Open the extensions menu by pressing the puzzle icon in the top right of the window
    * Click the "detect-code-libraries" extension entry
    * A popup will show up with a "Detect" button. Click it. You should see an alert dialog show up which says that
      jQuery was detected!
1. Try more sites:
    * Detect libraries at <https://vuejs.org/> and <https://lodash.com/>.
    * To be able to detect libraries on other sites, you must first add them to the `externally_connectable`
      configuration in the `manifest.json` file.


## Firefox

DCL can also be installed as a web extension in Firefox! Follow these instructions to install it:

1. Open Firefox to the debug page
   * Open Firefox
   * Paste and go to this URL: <about:debugging#/runtime/this-firefox>
1. Load the plugin
   * Click the button with the words *Load Temporary Add-on…*
   * In the file finder window that opens, find the file `distribution/firefox-manifest-v2-web-extension/manifest.json` and
     click *Open*
   * It's installed!
