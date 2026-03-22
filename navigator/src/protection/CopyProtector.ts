export interface CopyProtectionOptions {
    onCopyBlocked?: () => void;
}

export class CopyProtector {
    private copyHandler: (event: ClipboardEvent) => void;

    constructor(options: CopyProtectionOptions = {}) {
        this.copyHandler = (event: ClipboardEvent) => {
            event.preventDefault();
            event.stopPropagation();
            options.onCopyBlocked?.();
        };

        document.addEventListener("copy", this.copyHandler, true);
        window.addEventListener("unload", () => this.destroy());
    }

    public destroy() {
        document.removeEventListener("copy", this.copyHandler, true);
    }
}
