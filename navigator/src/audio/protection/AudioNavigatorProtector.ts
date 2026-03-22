import { NavigatorProtector } from "../../protection/NavigatorProtector";
import { DragAndDropProtector } from "../../protection/DragAndDropProtector";
import { CopyProtector } from "../../protection/CopyProtector";
import { IContentProtectionConfig } from "../../Navigator";

export class AudioNavigatorProtector extends NavigatorProtector {
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
