import { Comms } from "../comms";

export abstract class Module {
    static readonly moduleName: string;
    abstract mount(wnd: Window, comms: Comms): boolean;
    abstract unmount(wnd: Window, comms: Comms): boolean;
}

export type ModuleDerived = {new (): Module} & typeof Module;