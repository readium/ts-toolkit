import { ReadiumWindow } from "./dom";

export interface BulkCopyProtectionOptions {
    enabled: boolean;
    maxSelectionPercent: number;
    absoluteMaxChars: number;
    minThreshold: number;
}

export class BulkCopyProtector {
    private options: BulkCopyProtectionOptions;
    private lastSelectionLength = 0;
    private lastSelectionTime = 0;

    constructor(
        private readonly window: ReadiumWindow,
        initialOptions: BulkCopyProtectionOptions
    ) {
        this.options = { ...initialOptions };
    }

    public shouldAllowCopy(event: ClipboardEvent): boolean {
        if (!this.options.enabled) return true;

        const selection = this.window.getSelection();
        if (!selection) return true;
        
        const selectedText = selection.toString();
        const selectedLength = selectedText.length;
        const docLength = this.window.document.body.innerText.length;

        if (selectedLength < this.options.minThreshold) {
            return true;
        }

        const now = Date.now();
        const timeSinceLastSelection = now - this.lastSelectionTime;
        
        const isRapidSelection = 
            timeSinceLastSelection < 100 && 
            selectedLength > this.lastSelectionLength * 5;
            
        const maxAllowedSelection = Math.min(
            docLength * this.options.maxSelectionPercent,
            this.options.absoluteMaxChars
        );

        if (selectedLength > maxAllowedSelection || isRapidSelection) {
            event.preventDefault();
            return false;
        }
        
        this.lastSelectionLength = selectedLength;
        this.lastSelectionTime = now;
        return true;
    }

    public destroy(): void {
        this.lastSelectionLength = 0;
        this.lastSelectionTime = 0;
        this.options = { ...this.options, enabled: false };
    }
}
