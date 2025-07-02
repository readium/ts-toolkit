// This is a workaround for css-selector-generator, which needs self.crypto
const self = {
    crypto: {
        getRandomValues: () => new Uint8Array(16)
    }
};

// Make self available to ESM modules
Object.defineProperty(globalThis, "self", {
    value: self,
    configurable: true,
    writable: true
});
