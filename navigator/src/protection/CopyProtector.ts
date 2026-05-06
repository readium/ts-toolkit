export interface CopyProtectionOptions {
    onCopyBlocked?: () => void;
}

export class CopyProtector {
    private copyHandler: (event: ClipboardEvent) => void;
    private unloadHandler: () => void;

    constructor(options: CopyProtectionOptions = {}) {
        this.copyHandler = (event: ClipboardEvent) => {
            event.preventDefault();
            event.stopPropagation();
            options.onCopyBlocked?.();
        };

        this.unloadHandler = () => this.destroy();

        document.addEventListener("copy", this.copyHandler, true);
        window.addEventListener("unload", this.unloadHandler);
    }

    public destroy() {
        document.removeEventListener("copy", this.copyHandler, true);
        window.removeEventListener("unload", this.unloadHandler);
    }
}
