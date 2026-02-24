import { Link, Locator, Publication, ReadingProgression } from "@readium/shared";
import { 
    ContentProtectionConfig, 
    PrintProtectionConfig, 
    KeyboardPeripheral,
    KeyCombo,
    DEV_TOOLS, 
    SELECT_ALL, 
    PRINT, 
    SAVE 
} from "@readium/navigator-html-injectables";

type cbb = (ok: boolean) => void;

export type IKeyboardPeripheralsConfig = Array<Omit<KeyboardPeripheral, 'type'> & {
    type: Exclude<string, 'developer_tools' | 'select_all' | 'print' | 'save'>;
}>;

export interface ProgressionRange {
    start: number;
    end: number;
}

export interface VisualNavigatorViewport {
    readingOrder: string[];  // Array of href strings for visible resources
    progressions: Map<string, ProgressionRange>;  // Map from href to visible scroll progression range
    positions: number[] | null;  // Range of visible positions
}

export interface IContentProtectionConfig extends ContentProtectionConfig { 
    protectPrinting?: PrintProtectionConfig;
    checkAutomation?: boolean;
    checkIFrameEmbedding?: boolean;
}

export abstract class Navigator {
    abstract get publication(): Publication; // Publication rendered by this navigator.
    abstract get currentLocator(): Locator; // Current position (detailed) in the publication. Can be used to save a bookmark to the current position.

    /**
     * Moves to the position in the publication corresponding to the given {Locator}.
     */
    abstract go(locator: Locator, animated: boolean, cb: cbb): void;

    /**
     * Moves to the position in the publication targeted by the given link.
     */
    abstract goLink(link: Link, animated: boolean, cb: cbb): void;

    /**
     * Moves to the next content portion (eg. page) in the reading progression direction.
     */
    abstract goForward(animated: boolean, cb: cbb): void;

    /**
     * Moves to the previous content portion (eg. page) in the reading progression direction.
     */
    abstract goBackward(animated: boolean, cb: cbb): void;

    // TODO listener

    /**
     * Destroy all resources associated with this navigator. Synonymous with "unmount"
     */
    abstract destroy(): void;

    /**
     * Merges keyboard peripherals from content protection config with user-provided peripherals
     * Content protection peripherals are added first for priority, then user peripherals are added only if they don't conflict
     */
    protected mergeKeyboardPeripherals(
        config: IContentProtectionConfig,
        keyboardPeripherals: IKeyboardPeripheralsConfig = []
    ): IKeyboardPeripheralsConfig {
        const peripherals: IKeyboardPeripheralsConfig = [];
        
        // Filter out any peripherals with reserved content protection types
        const filteredUserPeripherals = keyboardPeripherals.filter(
            peripheral => !['developer_tools', 'select_all', 'print', 'save'].includes(peripheral.type)
        );
        
        // Add content protection peripherals first for priority
        if (config.disableSelectAll) {
            peripherals.push(SELECT_ALL);
        }
        if (config.disableSave) {
            peripherals.push(SAVE);
        }
        if (config.monitorDevTools) {
            peripherals.push(DEV_TOOLS);
        }
        if (config.protectPrinting?.disable) {
            peripherals.push(PRINT);
        }
        
        // Add user peripherals with conflicting combos removed
        for (const userPeripheral of filteredUserPeripherals) {
            // Filter out combos that conflict with existing peripherals
            const filteredCombos = userPeripheral.keyCombos.filter((userCombo: KeyCombo) =>
                !peripherals.some(existingPeripheral =>
                    existingPeripheral.keyCombos.some((existingCombo: KeyCombo) =>
                        userCombo.keyCode === existingCombo.keyCode &&
                        userCombo.ctrl === existingCombo.ctrl &&
                        userCombo.shift === existingCombo.shift &&
                        userCombo.alt === existingCombo.alt &&
                        userCombo.meta === existingCombo.meta
                    )
                )
            );
            
            // Add the peripheral with filtered combos if any remain
            if (filteredCombos.length > 0) {
                peripherals.push({
                    ...userPeripheral,
                    keyCombos: filteredCombos
                });
            }
        }
        
        return peripherals;
    }
}

export abstract class VisualNavigator extends Navigator {
    /**
     * Current reading progression direction.
     */
     abstract get readingProgression(): ReadingProgression;


     /**
      * Moves to the left content portion (eg. page) relative to the reading progression direction.
      */
     goLeft(animated = false, completion: cbb) {
        if(this.readingProgression === ReadingProgression.ltr)
            this.goBackward(animated, completion);
        else if(this.readingProgression === ReadingProgression.rtl)
            this.goForward(animated, completion);
     }

     /**
      * Moves to the right content portion (eg. page) relative to the reading progression direction.
      */
     goRight(animated = false, completion: cbb) {
        if(this.readingProgression === ReadingProgression.ltr)
            this.goForward(animated, completion);
        else if(this.readingProgression === ReadingProgression.rtl)
            this.goBackward(animated, completion);
     }
}


// TODO MediaNavigator