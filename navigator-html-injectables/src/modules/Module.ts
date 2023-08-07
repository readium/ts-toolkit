import { Comms } from "../comms";
import { ModuleName } from "./ModuleLibrary";

export abstract class Module {
    static readonly moduleName: ModuleName; // snake_case name of the module, must be unique.

    // Called by the loader, where modules are mounted one after another.
    // In this function, the Module can register any commands it should listen
    // to using comms.register, and send any commands using comms.send. Modules
    // must be designed to not use comms.send before the communication handshake
    // has finished (so not during the mount function).
    abstract mount(wnd: Window, comms: Comms): boolean;

    // Unmounting should completely clean up any event listeners or
    // active modification of the HTML content, and cease all activity. This is
    // because an implementer should be able to mount and unmount Modules at any
    // time, to, for example, switch reading modes. There should be no difference
    // in behavior after mounting and unmounting a Module repeatedly.
    abstract unmount(wnd: Window, comms: Comms): boolean;
}

export type ModuleDerived = {new (): Module} & typeof Module;