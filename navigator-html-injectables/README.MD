# navigator-html-injectables

This package can be used either inside a reflowable (X)HTML or outside (in a javascript environment) to provide access and control over a resource from a navigator on any modern browser or embedded browser frame. This is a replacement for the javascript stubs found in the mobile SDKs, such as [this](https://github.com/readium/kotlin-toolkit/tree/develop/readium/navigator/src/main/assets/_scripts/src).

Special care should be taken to make the final produced build compatible with a set of browsers that are older than what you'd typically support on the web, since this SDK can be used in a mobile app's webview, which is an environment that tends to run on an outdated web engine.