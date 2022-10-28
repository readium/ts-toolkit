import { Comms } from "./comms/comms";
import { Module, ModuleDerived, ModuleLibrary, ModuleName } from "./modules";

/**
 * The Module loader. Handles initialization of the HTML injectables
 * in the target Window, which could be an IFrame, or the current window).
 */
export class Loader<T extends string = ModuleName> {
    private loadedModules: Module[] = [];
    private readonly wnd: Window;
    private readonly comms: Comms;

    /**
     * @param wnd Window instance to operate on
     * @param initialModules List of initial modules to load
     */
    constructor(wnd: Window = window, initialModules: string[] = []) {
        this.wnd = wnd; // Window instance
        this.comms = new Comms(wnd);

        const uniqueModules = [...new Set(initialModules)]; // Deduplicate initial module list
        if(!uniqueModules.length) return; // No initial modules

        if(typeof wnd === 'undefined') // Detect accidental Node/SSR usage
            throw Error("Loader is not in a web browser");

        if(wnd.parent !== wnd) this.comms.log("Loader is probably in a frame");

        this.loadedModules = uniqueModules.map(name => {
            const nm = this.loadModule(name);
            if(!nm) return;
            nm.mount(this.wnd, this.comms); // Mount module
            return nm;
        }).filter(m => m !== undefined) as Module[]; // Filter out all modules not found
    }

    private loadModule(moduleName: string) {
        const m = ModuleLibrary.get(moduleName); // Find a module with this name
        if(m === undefined) {
            this.comms.log(`Module "${name}" does not exist in the library`)
            return m;
        }
        return new m(); // Construct module
    }

    /**
     * Add a module by name
     * @param moduleName Module name
     * @returns Success
     */
    public addModule(moduleName: T): boolean {
        const nm = this.loadModule(moduleName);
        if(!nm || !nm.mount(this.wnd, this.comms)) return false; // Mount module
        this.loadedModules.push(nm); // Add module to list
        return true;
    }

    /**
     * Remove a module by name
     * @param moduleName Module name
     * @returns Success
     */
    public removeModule(moduleName: T): boolean {
        const m = ModuleLibrary.get(moduleName) as ModuleDerived; // Get the right class
        if(m === undefined) {
            this.comms.log(`Module "${moduleName}" does not exist in the library`)
            return false;
        }
        const index = this.loadedModules.findIndex(lm => lm instanceof m); // Find module
        if(index < 0) return false; // Module not found
        this.loadedModules[index].unmount(this.wnd, this.comms); // Unmount module
        this.loadedModules.splice(index, 1); // Remove module
        return true;
    }

    /**
     * Unmount and remove all modules
     */
    public destroy() {
        this.comms.destroy();
        this.loadedModules.forEach(m => m.unmount(this.wnd, this.comms));
        this.loadedModules = [];
    }
}