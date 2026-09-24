import { KeyCombo, KeyboardPeripheral } from "@readium/navigator-html-injectables";

export class KeyboardConditionBridge {
    private unsubs: Array<() => void> = [];
    private conditionValues = new Map<KeyCombo, boolean>();

    constructor(
        private config: KeyboardPeripheral[],
        private onUpdate: (serializable: KeyboardPeripheral[]) => void
    ) {}

    setup() {
        let initializing = true;

        // Subscribe once per distinct condition object: combos commonly share
        // one condition, and a per-combo subscription would trigger one full
        // onUpdate rebuild per combo for a single condition change.
        const combosByCondition = new Map<NonNullable<KeyCombo["condition"]>, KeyCombo[]>();
        this.config.forEach(peripheral =>
            peripheral.keyCombos.forEach(combo => {
                if (combo.condition) {
                    const combos = combosByCondition.get(combo.condition) ?? [];
                    combos.push(combo);
                    combosByCondition.set(combo.condition, combos);
                }
            })
        );

        combosByCondition.forEach((combos, condition) => {
            const unsub = condition.subscribe((value) => {
                combos.forEach(combo => this.conditionValues.set(combo, value));
                if (!initializing) this.onUpdate(this.buildSerializable());
            });
            this.unsubs.push(unsub);
        });

        initializing = false;
        this.onUpdate(this.buildSerializable());
    }

    private buildSerializable(): KeyboardPeripheral[] {
        return this.config
            .map(peripheral => ({
                ...peripheral,
                keyCombos: peripheral.keyCombos
                    .filter(combo => !combo.condition || this.conditionValues.get(combo) === true)
                    .map(({ condition, ...rest }) => rest),
            }))
            .filter(p => p.keyCombos.length > 0);
    }

    destroy() {
        this.unsubs.forEach(u => u());
        this.unsubs = [];
        this.conditionValues.clear();
    }
}
