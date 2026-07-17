import { NavigatorProtector } from "../../protection/NavigatorProtector.ts";
import { DragAndDropProtector } from "../../protection/DragAndDropProtector.ts";
import { CopyProtector } from "../../protection/CopyProtector.ts";
import { IContentProtectionConfig } from "../../Navigator.ts";

/**
 * Content protection for the Divina navigator. Because Divina renders images
 * directly in the host DOM (no iframes), the in-frame halves of the EPUB
 * protection (copy and drag-and-drop blocking) must run host-side instead,
 * like the audio navigator does.
 */
export class DivinaNavigatorProtector extends NavigatorProtector {
    private dragAndDropProtector?: DragAndDropProtector;
    private copyProtector?: CopyProtector;

    constructor(config: IContentProtectionConfig = {}) {
        super(config);

        if (config.disableDragAndDrop) {
            this.dragAndDropProtector = new DragAndDropProtector({
                onDragDetected: (dataTransferTypes) => {
                    this.dispatchSuspiciousActivity("drag_detected", { dataTransferTypes, targetFrameSrc: "" });
                },
                onDropDetected: (dataTransferTypes, fileCount) => {
                    this.dispatchSuspiciousActivity("drop_detected", { dataTransferTypes, fileCount, targetFrameSrc: "" });
                }
            });
        }

        if (config.protectCopy) {
            this.copyProtector = new CopyProtector({
                onCopyBlocked: () => {
                    this.dispatchSuspiciousActivity("bulk_copy", { targetFrameSrc: "" });
                }
            });
        }
    }

    public override destroy() {
        super.destroy();
        this.dragAndDropProtector?.destroy();
        this.copyProtector?.destroy();
    }
}
