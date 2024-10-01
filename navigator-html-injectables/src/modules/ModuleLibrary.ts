import { ModuleDerived } from "./Module";
import { ColumnSnapper } from "./snapper/ColumnSnapper";
import { ScrollSnapper } from "./snapper/ScrollSnapper";
import { Peripherals } from "./Peripherals";
import { ReflowableSetup } from "./setup/ReflowableSetup";
import { FixedSetup } from "./setup/FixedSetup";
import { Decorator } from "./Decorator";

// All the module names. TODO: Come up with a better way of collecting these in a way TS will recognize
export type ModuleName =
    "setup" |
    "snapper" |
    "column_snapper" |
    "scroll_snapper" |
    "fixed_setup" |
    "decorator" |
    "reflowable_setup" |
    "peripherals";

// Modules that are valid for FXL publications
export const FXLModules: ModuleName[] = [
    "fixed_setup",
    "decorator",
    "peripherals"
];

// Modules that are valid for reflowable publications
export const ReflowableModules: ModuleName[] = [
    "reflowable_setup",
    "decorator",
    "peripherals",
    "column_snapper",
    "scroll_snapper"
];

export const ModuleLibrary = new Map<string, ModuleDerived>([
    // All modules go here
    FixedSetup,
    ReflowableSetup,
    Peripherals,
    Decorator,
    ColumnSnapper,
    ScrollSnapper,
].map(m => [m.moduleName, m])); // Turn module list into K/V list for quick access by name