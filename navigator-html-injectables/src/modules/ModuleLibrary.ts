import { ModuleDerived } from "./Module.ts";
import { ColumnSnapper } from "./snapper/ColumnSnapper.ts";
import { ScrollSnapper } from "./snapper/ScrollSnapper.ts";
import { WebPubSnapper } from "./snapper/WebPubSnapper.ts";
import { Peripherals } from "./Peripherals.ts";
import { ReflowableSetup } from "./setup/ReflowableSetup.ts";
import { FixedSetup } from "./setup/FixedSetup.ts";
import { Decorator } from "./Decorator.ts";
import { WebPubSetup } from "./setup/WebPubSetup.ts";
import { PrintProtector } from "../protection/PrintProtector.ts";
import { CJKVerticalSnapper } from "./snapper/CJKVerticalSnapper.ts";

// All the module names. TODO: Come up with a better way of collecting these in a way TS will recognize
export type ModuleName =
    "setup" |
    "snapper" |
    "column_snapper" |
    "scroll_snapper" |
    "cjk_vertical_snapper" |
    "webpub_snapper" |
    "fixed_setup" |
    "decorator" |
    "reflowable_setup" |
    "peripherals" |
    "webpub_setup" |
    "print_protection";

// Modules that are valid for FXL publications
export const FXLModules: ModuleName[] = [
    "fixed_setup",
    "decorator",
    "peripherals",
    "print_protection"
];

// Modules that are valid for reflowable publications
export const ReflowableModules: ModuleName[] = [
    "reflowable_setup",
    "decorator",
    "peripherals",
    "column_snapper",
    "scroll_snapper",
    "cjk_vertical_snapper",
    "print_protection"
];

// Modules that are valid for WebPub publications (simple scroll-based)
export const WebPubModules: ModuleName[] = [
    "webpub_setup",
    "webpub_snapper",
    "decorator",
    "peripherals",
    "print_protection"
];

export const ModuleLibrary = new Map<string, ModuleDerived>([
    // All modules go here
    FixedSetup,
    ReflowableSetup,
    WebPubSetup,
    WebPubSnapper,
    Peripherals,
    Decorator,
    ColumnSnapper,
    ScrollSnapper,
    CJKVerticalSnapper,
    PrintProtector
].map(m => [m.moduleName, m])); // Turn module list into K/V list for quick access by name
