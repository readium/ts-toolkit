/*!
 *                                                                                                                         (℠)
 *  # sML.js | I'm a Simple and Middling Library.
 *
 *  * Copyright (c) Satoru MATSUSHIMA - https://github.com/satorumurmur/sML
 *  * Licensed under the MIT license. - http://www.opensource.org/licenses/mit-license.php
 *
 * Portions of this code come from the sML library
 * Current version: 1.0.36
 */

declare interface OSFlags {
    iOS: number[];
    macOS: number[];
    iPadOS: number[];
    WindowsPhone: number[];
    ChromeOS: number[];
    Windows: number[];
    Android: number[];
    Linux: number[];
    Firefox: boolean;
}

declare interface UAFlags {
    Gecko: number[];
    Firefox: number[];
    Waterfox: number[];
    Opera: number[];
    Silk: number[];
    Blink: number[];
    EdgeHTML: number[];
    Chrome: number[];
    Chromium: number[];
    Phoebe: number[];
    UCBrowser: number[];
    Vivaldi: number[];
    Safari: number[];
    Edge: number[];
    WebKit: number[];
    Trident: number[];
    InternetExplorer: number[];
    Flash: number[];
    Facebook: number[];
    LINE: number[];
}

class sML {
    OS: OSFlags;
    UA: UAFlags;
    Env!: string[];

    constructor() {
        const NUAD = (navigator as any).userAgentData, NUA = navigator.userAgent;

        const _sV = (V?: string | number) => (typeof V === "string" || typeof V === "number") && V ? String(V).replace(/_/g, ".").split(".").map(I => parseInt(I) || 0) : [];
        const _dV = (Pre="") => {
            if(!Pre) return [];
            const RE = new RegExp("^.*" + Pre + "[ :\\/]?(\\d+([\\._]\\d+)*).*$");
            if(!RE.test(NUA)) return [];
            return _sV(NUA.replace(RE, "$1"));
        };

        this.OS = ((OS: OSFlags) => {
            if(                /(macOS|Mac OS X)/.test(NUA)) {
                    if(/\(iP(hone|od touch);/.test(NUA)) OS.iOS = _dV("CPU (?:iPhone )?OS ");
                    if(             /\(iPad;/.test(NUA)) OS.iOS = OS.iPadOS = _dV("CPU (?:iPhone )?OS ");
                else if( /(macOS|Mac OS X) \d/.test(NUA)) document.ontouchend !== undefined ? OS.iOS = OS.iPadOS = _dV() : OS.macOS = _dV("(?:macOS|Mac OS X) ");
            } else if(      /Windows( NT)? \d/.test(NUA)) OS.Windows = (V => V[0] !== 6 || !V[1] ? V : V[1] === 1 ? [7] : V[1] === 2 ? [8] : [8, 1])(_dV("Windows(?: NT)?"));
            else if(            /Android \d/.test(NUA)) OS.Android = _dV("Android");
            else if(                  /CrOS/.test(NUA)) OS.ChromeOS = _dV();
            else if(                  /X11;/.test(NUA)) OS.Linux = _dV();
            return OS;
        })({} as OSFlags); if(NUAD) NUAD.getHighEntropyValues(["architecture", "model", "platform", "platformVersion", "uaFullVersion"]).then((HEUAD: any) => (OS => { const Pf = HEUAD.platform, PfV = HEUAD.platformVersion; if(!Pf || !PfV) return;
                if(         /^i(OS|P(hone|od touch))$/.test(Pf)) OS.iOS = _sV(PfV);
            else if(                      /^iPad(OS)?$/.test(Pf)) OS.iOS = OS.iPadOS = _sV(PfV);
            else if(/^(macOS|(Mac )?OS X|Mac(Intel)?)$/.test(Pf)) document.ontouchend !== undefined ? OS.iOS = OS.iPadOS = _sV() : OS.macOS = _sV(PfV);
            else if(           /^(Microsoft )?Windows$/.test(Pf)) OS.Windows = _sV(PfV);
            else if(              /^(Google )?Android$/.test(Pf)) OS.Android = _sV(PfV);
            else if(     /^((Google )?Chrome OS|CrOS)$/.test(Pf)) OS.ChromeOS = _sV(PfV);
            else if(             /^(Linux|Ubuntu|X11)$/.test(Pf)) OS.Linux = _sV(PfV);
            else return; /**/ Object.keys(this.OS).forEach(Key => delete (this.OS as any)[Key]), Object.assign(this.OS, OS);
        })({} as OSFlags));

        this.UA = ((UA: UAFlags) => { let _OK = false;
            if(NUAD && Array.isArray(NUAD.brands)) { const BnV = NUAD.brands.reduce((BnV: string[], _: any) => { (BnV[_.brand] as any) = [_.version * 1]; return BnV; }, {});
                    if(BnV["Google Chrome"])  _OK = true, UA.Blink = UA.Chromium = BnV["Chromium"] || [], UA.Chrome = BnV["Google Chrome"];
                else if(BnV["Microsoft Edge"]) _OK = true, UA.Blink = UA.Chromium = BnV["Chromium"] || [], UA.Edge = BnV["Microsoft Edge"];
                else if(BnV["Opera"])          _OK = true, UA.Blink = UA.Chromium = BnV["Chromium"] || [], UA.Opera = BnV["Opera"];
            } if(!_OK) {
                if(              / Gecko\/\d/.test(NUA)) { UA.Gecko = _dV("rv");
                        if(  / Waterfox\/\d/.test(NUA))   UA.Waterfox = _dV("Waterfox");
                    else if(   / Firefox\/\d/.test(NUA))   UA.Firefox = _dV("Firefox");
                } else if(        / Edge\/\d/.test(NUA)) { UA.EdgeHTML = _dV("Edge");
                                                        UA.Edge = UA.EdgeHTML;
                } else if(/ Chrom(ium|e)\/\d/.test(NUA)) { UA.Blink = UA.Chromium = (V => V[0] ? V : _dV("Chrome"))(_dV("Chromium"));
                        if(     / EdgA?\/\d/.test(NUA))   UA.Edge = (V => V[0] ? V : _dV("Edg"))(_dV("EdgA"));
                    else if(       / OPR\/\d/.test(NUA))   UA.Opera = _dV("OPR");
                    else if(   / Vivaldi\/\d/.test(NUA))   UA.Vivaldi = _dV("Vivaldi");
                    else if(      / Silk\/\d/.test(NUA))   UA.Silk = _dV("Silk");
                    else if( / UCBrowser\/\d/.test(NUA))   UA.UCBrowser = _dV("UCBrowser");
                    else if(    / Phoebe\/\d/.test(NUA))   UA.Phoebe = _dV("Phoebe");
                    else                                   UA.Chrome = (V => V[0] ? V : UA.Chromium)(_dV("Chrome"));
                } else if( / AppleWebKit\/\d/.test(NUA)) { UA.WebKit = _dV("AppleWebKit");
                        if(      / CriOS \d/.test(NUA))   UA.Chrome = _dV("CriOS");
                    else if(      / FxiOS \d/.test(NUA))   UA.Firefox = _dV("FxiOS");
                    else if(    / EdgiOS\/\d/.test(NUA))   UA.Edge = _dV("EdgiOS");
                    else if(   / Version\/\d/.test(NUA))   UA.Safari = _dV("Version");
                } else if(     / Trident\/\d/.test(NUA)) { UA.Trident = _dV("Trident");
                                                        UA.InternetExplorer = (V => V[0] ? V : _dV("MSIE"))(_dV("rv"));
                }
            } /*+*/ if( /[\[; ]FB(AN|_IAB)\//.test(NUA))   UA.Facebook = _dV("FBAV");
            /*+*/ if(           / Line\/\d/.test(NUA))   UA.LINE = _dV("Line");
            return UA;
        })({} as UAFlags);

        (this.Env as any) = { get: () => [this.OS, this.UA].reduce((Env: string[], OS_UA) => { for(const Par in OS_UA) if((OS_UA as any)[Par]) Env.push(Par); return Env; }, []) };
    }
}

export default (new sML);