export interface DragAndDropProtectionOptions {
    onDragDetected?: (dataTransferTypes: readonly string[]) => void;
    onDropDetected?: (dataTransferTypes: readonly string[], fileCount: number) => void;
}

export class DragAndDropProtector {
    private dragstartHandler: (event: DragEvent) => void;
    private dropHandler: (event: DragEvent) => void;
    private unloadHandler: () => void;

    constructor(options: DragAndDropProtectionOptions = {}) {
        this.dragstartHandler = (event: DragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            options.onDragDetected?.(Array.from(event.dataTransfer?.types ?? []));
        };

        this.dropHandler = (event: DragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const types = Array.from(event.dataTransfer?.types ?? []);
            const fileCount = event.dataTransfer?.files.length ?? 0;
            options.onDropDetected?.(types, fileCount);
        };

        this.unloadHandler = () => this.destroy();

        document.addEventListener("dragstart", this.dragstartHandler, true);
        document.addEventListener("drop", this.dropHandler, true);
        window.addEventListener("unload", this.unloadHandler);
    }

    public destroy() {
        document.removeEventListener("dragstart", this.dragstartHandler, true);
        document.removeEventListener("drop", this.dropHandler, true);
        window.removeEventListener("unload", this.unloadHandler);
    }
}
