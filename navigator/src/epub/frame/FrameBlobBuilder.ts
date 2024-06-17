import { MediaType } from "@readium/shared/src/util/mediatype";
import { Link, Publication } from "@readium/shared/src/publication";

// Readium CSS imports
// The "?inline" query is to prevent some bundlers from injecting these into the page (e.g. vite)
import readiumCSSAfter from "readium-css/css/dist/ReadiumCSS-after.css?inline";
import readiumCSSBefore from "readium-css/css/dist/ReadiumCSS-before.css?inline";
import readiumCSSDefault from "readium-css/css/dist/ReadiumCSS-default.css?inline";

// Utilities
const blobify = (source: string, type: string) => URL.createObjectURL(new Blob([source], { type }));
const stripJS = (source: string) => source.replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "").replace(/\s+/g, " ");
const stripCSS = (source: string) => source.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, '').replace(/ {2,}/g, ' ')
    // Fully resolve absolute local URLs created by bundlers since it's going into a blob
    .replace(/url\((?!(https?:)?\/\/)("?)\/([^\)]+)/g, `url($2${window.location.origin}/$3`);
const scriptify = (doc: Document, source: string) => {
    const s = doc.createElement("script");
    s.dataset.readium = "true";
    s.src = source.startsWith("blob:") ? source : blobify(source, "text/javascript");
    return s;
}
const styleify = (doc: Document, source: string) => {
    const s = doc.createElement("link");
    s.dataset.readium = "true";
    s.rel = "stylesheet";
    s.type = "text/css";
    s.href = source.startsWith("blob:") ? source : blobify(source, "text/css");
    return s;
}

type CacheFunction = () => string;
const resourceBlobCache = new Map<string, string>();
const cached = (key: string, cacher: CacheFunction) => {
    if(resourceBlobCache.has(key)) return resourceBlobCache.get(key)!;
    const value = cacher();
    resourceBlobCache.set(key, value);
    return value;
};

// https://unpkg.com/css-selector-generator@3.6.4/build/index.js
// CssSelectorGenerator --> _readium_cssSelectorGenerator
// This has to be injected because you need to be in the iframe's context for it to work properly
const cssSelectorGenerator = (doc: Document) => scriptify(doc, cached("css-selector-generator", () => blobify(
    "!function(t,e){\"object\"==typeof exports&&\"object\"==typeof module?module.exports=e():\"function\"==typeof define&&define.amd?define([],e):\"object\"==typeof exports?exports._readium_cssSelectorGenerator=e():t._readium_cssSelectorGenerator=e()}(self,(()=>(()=>{\"use strict\";var t,e,n={d:(t,e)=>{for(var o in e)n.o(e,o)&&!n.o(t,o)&&Object.defineProperty(t,o,{enumerable:!0,get:e[o]})},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),r:t=>{\"undefined\"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:\"Module\"}),Object.defineProperty(t,\"__esModule\",{value:!0})}},o={};function r(t){return t&&t instanceof Element}function i(t=\"unknown problem\",...e){console.warn(`CssSelectorGenerator: ${t}`,...e)}n.r(o),n.d(o,{default:()=>z,getCssSelector:()=>U}),function(t){t.NONE=\"none\",t.DESCENDANT=\"descendant\",t.CHILD=\"child\"}(t||(t={})),function(t){t.id=\"id\",t.class=\"class\",t.tag=\"tag\",t.attribute=\"attribute\",t.nthchild=\"nthchild\",t.nthoftype=\"nthoftype\"}(e||(e={}));const c={selectors:[e.id,e.class,e.tag,e.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:Number.POSITIVE_INFINITY,maxCandidates:Number.POSITIVE_INFINITY};function u(t){return t instanceof RegExp}function s(t){return[\"string\",\"function\"].includes(typeof t)||u(t)}function l(t){return Array.isArray(t)?t.filter(s):[]}function a(t){const e=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return function(t){return t instanceof Node}(t)&&e.includes(t.nodeType)}function f(t,e){if(a(t))return t.contains(e)||i(\"element root mismatch\",\"Provided root does not contain the element. This will most likely result in producing a fallback selector using element\'s real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will nto work as intended.\"),t;const n=e.getRootNode({composed:!1});return a(n)?(n!==document&&i(\"shadow root inferred\",\"You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended.\"),n):e.ownerDocument.querySelector(\":root\")}function d(t){return\"number\"==typeof t?t:Number.POSITIVE_INFINITY}function m(t=[]){const[e=[],...n]=t;return 0===n.length?e:n.reduce(((t,e)=>t.filter((t=>e.includes(t)))),e)}function p(t){return[].concat(...t)}function h(t){const e=t.map((t=>{if(u(t))return e=>t.test(e);if(\"function\"==typeof t)return e=>{const n=t(e);return\"boolean\"!=typeof n?(i(\"pattern matcher function invalid\",\"Provided pattern matching function does not return boolean. It\'s result will be ignored.\",t),!1):n};if(\"string\"==typeof t){const e=new RegExp(\"^\"+t.replace(\/[|\\\\{}()[\\]^$+?.]\/g,\"\\\\$&\").replace(\/\\*\/g,\".+\")+\"$\");return t=>e.test(t)}return i(\"pattern matcher invalid\",\"Pattern matching only accepts strings, regular expressions and\/or functions. This item is invalid and will be ignored.\",t),()=>!1}));return t=>e.some((e=>e(t)))}function g(t,e,n){const o=Array.from(f(n,t[0]).querySelectorAll(e));return o.length===t.length&&t.every((t=>o.includes(t)))}function y(t,e){e=null!=e?e:function(t){return t.ownerDocument.querySelector(\":root\")}(t);const n=[];let o=t;for(;r(o)&&o!==e;)n.push(o),o=o.parentElement;return n}function b(t,e){return m(t.map((t=>y(t,e))))}const N={[t.NONE]:{type:t.NONE,value:\"\"},[t.DESCENDANT]:{type:t.DESCENDANT,value:\" > \"},[t.CHILD]:{type:t.CHILD,value:\" \"}},S=new RegExp([\"^$\",\"\\\\s\"].join(\"|\")),E=new RegExp([\"^$\"].join(\"|\")),w=[e.nthoftype,e.tag,e.id,e.class,e.attribute,e.nthchild],v=h([\"class\",\"id\",\"ng-*\"]);function C({nodeName:t}){return`[${t}]`}function O({nodeName:t,nodeValue:e}){return`[${t}=\'${L(e)}\']`}function T(t){const e=Array.from(t.attributes).filter((e=>function({nodeName:t},e){const n=e.tagName.toLowerCase();return!([\"input\",\"option\"].includes(n)&&\"value\"===t||v(t))}(e,t)));return[...e.map(C),...e.map(O)]}function I(t){return(t.getAttribute(\"class\")||\"\").trim().split(\/\\s+\/).filter((t=>!E.test(t))).map((t=>`.${L(t)}`))}function x(t){const e=t.getAttribute(\"id\")||\"\",n=`#${L(e)}`,o=t.getRootNode({composed:!1});return!S.test(e)&&g([t],n,o)?[n]:[]}function j(t){const e=t.parentNode;if(e){const n=Array.from(e.childNodes).filter(r).indexOf(t);if(n>-1)return[`:nth-child(${n+1})`]}return[]}function A(t){return[L(t.tagName.toLowerCase())]}function D(t){const e=[...new Set(p(t.map(A)))];return 0===e.length||e.length>1?[]:[e[0]]}function $(t){const e=D([t])[0],n=t.parentElement;if(n){const o=Array.from(n.children).filter((t=>t.tagName.toLowerCase()===e)),r=o.indexOf(t);if(r>-1)return[`${e}:nth-of-type(${r+1})`]}return[]}function R(t=[],{maxResults:e=Number.POSITIVE_INFINITY}={}){const n=[];let o=0,r=k(1);for(;r.length<=t.length&&o<e;)o+=1,n.push(r.map((e=>t[e]))),r=P(r,t.length-1);return n}function P(t=[],e=0){const n=t.length;if(0===n)return[];const o=[...t];o[n-1]+=1;for(let t=n-1;t>=0;t--)if(o[t]>e){if(0===t)return k(n+1);o[t-1]++,o[t]=o[t-1]+1}return o[n-1]>e?k(n+1):o}function k(t=1){return Array.from(Array(t).keys())}const _=\":\".charCodeAt(0).toString(16).toUpperCase(),M=\/[ !\"#$%&\'()\\[\\]{|}<>*+,.\/;=?@^`~\\\\]\/;function L(t=\"\"){var e,n;return null!==(n=null===(e=null===CSS||void 0===CSS?void 0:CSS.escape)||void 0===e?void 0:e.call(CSS,t))&&void 0!==n?n:function(t=\"\"){return t.split(\"\").map((t=>\":\"===t?`\\\\${_} `:M.test(t)?`\\\\${t}`:escape(t).replace(\/%\/g,\"\\\\\"))).join(\"\")}(t)}const q={tag:D,id:function(t){return 0===t.length||t.length>1?[]:x(t[0])},class:function(t){return m(t.map(I))},attribute:function(t){return m(t.map(T))},nthchild:function(t){return m(t.map(j))},nthoftype:function(t){return m(t.map($))}},F={tag:A,id:x,class:I,attribute:T,nthchild:j,nthoftype:$};function V(t){return t.includes(e.tag)||t.includes(e.nthoftype)?[...t]:[...t,e.tag]}function Y(t={}){const n=[...w];return t[e.tag]&&t[e.nthoftype]&&n.splice(n.indexOf(e.tag),1),n.map((e=>{return(o=t)[n=e]?o[n].join(\"\"):\"\";var n,o})).join(\"\")}function B(t,e,n=\"\",o){const r=function(t,e){return\"\"===e?t:function(t,e){return[...t.map((t=>e+\" \"+t)),...t.map((t=>e+\" > \"+t))]}(t,e)}(function(t,e,n){const o=function(t,e){const{blacklist:n,whitelist:o,combineWithinSelector:r,maxCombinations:i}=e,c=h(n),u=h(o);return function(t){const{selectors:e,includeTag:n}=t,o=[].concat(e);return n&&!o.includes(\"tag\")&&o.push(\"tag\"),o}(e).reduce(((e,n)=>{const o=function(t,e){var n;return(null!==(n=q[e])&&void 0!==n?n:()=>[])(t)}(t,n),s=function(t=[],e,n){return t.filter((t=>n(t)||!e(t)))}(o,c,u),l=function(t=[],e){return t.sort(((t,n)=>{const o=e(t),r=e(n);return o&&!r?-1:!o&&r?1:0}))}(s,u);return e[n]=r?R(l,{maxResults:i}):l.map((t=>[t])),e}),{})}(t,n),r=function(t,e){return function(t){const{selectors:e,combineBetweenSelectors:n,includeTag:o,maxCandidates:r}=t,i=n?R(e,{maxResults:r}):e.map((t=>[t]));return o?i.map(V):i}(e).map((e=>function(t,e){const n={};return t.forEach((t=>{const o=e[t];o.length>0&&(n[t]=o)})),function(t={}){let e=[];return Object.entries(t).forEach((([t,n])=>{e=n.flatMap((n=>0===e.length?[{[t]:n}]:e.map((e=>Object.assign(Object.assign({},e),{[t]:n})))))})),e}(n).map(Y)}(e,t))).filter((t=>t.length>0))}(o,n),i=p(r);return[...new Set(i)]}(t,o.root,o),n);for(const e of r)if(g(t,e,o.root))return e;return null}function G(t){return{value:t,include:!1}}function W({selectors:t,operator:n}){let o=[...w];t[e.tag]&&t[e.nthoftype]&&(o=o.filter((t=>t!==e.tag)));let r=\"\";return o.forEach((e=>{(t[e]||[]).forEach((({value:t,include:e})=>{e&&(r+=t)}))})),n.value+r}function H(n){return[\":root\",...y(n).reverse().map((n=>{const o=function(e,n,o=t.NONE){const r={};return n.forEach((t=>{Reflect.set(r,t,function(t,e){return F[e](t)}(e,t).map(G))})),{element:e,operator:N[o],selectors:r}}(n,[e.nthchild],t.DESCENDANT);return o.selectors.nthchild.forEach((t=>{t.include=!0})),o})).map(W)].join(\"\")}function U(t,n={}){const o=function(t){const e=(Array.isArray(t)?t:[t]).filter(r);return[...new Set(e)]}(t),i=function(t,n={}){const o=Object.assign(Object.assign({},c),n);return{selectors:(r=o.selectors,Array.isArray(r)?r.filter((t=>{return n=e,o=t,Object.values(n).includes(o);var n,o})):[]),whitelist:l(o.whitelist),blacklist:l(o.blacklist),root:f(o.root,t),combineWithinSelector:!!o.combineWithinSelector,combineBetweenSelectors:!!o.combineBetweenSelectors,includeTag:!!o.includeTag,maxCombinations:d(o.maxCombinations),maxCandidates:d(o.maxCandidates)};var r}(o[0],n);let u=\"\",s=i.root;function a(){return function(t,e,n=\"\",o){if(0===t.length)return null;const r=[t.length>1?t:[],...b(t,e).map((t=>[t]))];for(const t of r){const e=B(t,0,n,o);if(e)return{foundElements:t,selector:e}}return null}(o,s,u,i)}let m=a();for(;m;){const{foundElements:t,selector:e}=m;if(g(o,e,i.root))return e;s=t[0],u=e,m=a()}return o.length>1?o.map((t=>U(t,i))).join(\", \"):function(t){return t.map(H).join(\", \")}(o)}const z=U;return o})()));",
    "text/javascript"
)));

// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
// For a more comprehensive implementation, see https://github.com/hackademix/noscript/blob/3a83c0e4a506f175e38b0342dad50cdca3eae836/src/content/syncFetchPolicy.js#L142
const rBefore = (doc: Document) => scriptify(doc, cached("JS-Before", () => blobify(stripJS(`
    window._readium_blockedEvents = [];
    window._readium_blockEvents = true;
    window._readium_eventBlocker = (e) => {
        if(!window._readium_blockEvents) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _readium_blockedEvents.push([
            1, e
        ]);
    };
    window.addEventListener("DOMContentLoaded", window._readium_eventBlocker, true);
    window.addEventListener("load", window._readium_eventBlocker, true);`
), "text/javascript")));
const rAfter = (doc: Document) => scriptify(doc, cached("JS-After", () => blobify(stripJS(`
    if(window.onload) window.onload = new Proxy(window.onload, {
        apply: function(target, receiver, args) {
            if(!window._readium_blockEvents) {
                Reflect.apply(target, receiver, args);
                return;
            }
            _readium_blockedEvents.push([
                0, target, receiver, args
            ]);
        }
    });`
), "text/javascript")));

export default class FrameBlobBuider {
    private readonly item: Link;
    private readonly burl: string;
    private readonly pub: Publication;

    constructor(pub: Publication, baseURL: string, item: Link) {
        this.pub = pub;
        this.item = item;
        this.burl = item.toURL(baseURL) || "";
    }

    public async build(fxl = false): Promise<string> {
        if(!this.item.mediaType.isHTML) {
            if(this.item.mediaType.isBitmap) {
                return this.buildImageFrame();
            } else
                throw Error("Unsupported frame mediatype " + this.item.mediaType.string);
        } else {
            return await this.buildHtmlFrame(fxl);
        }
    }

    private async buildHtmlFrame(fxl = false): Promise<string> {
        // Load the HTML resource
        const txt = await this.pub.get(this.item).readAsString();
        if(!txt) throw new Error(`Failed reading item ${this.item.href}`);
        const doc = new DOMParser().parseFromString(
            txt,
            this.item.mediaType.string as DOMParserSupportedType
        );
        const perror = doc.querySelector("parsererror");
        if(perror) {
            const details = perror.querySelector("div");
            throw new Error(`Failed parsing item ${this.item.href}: ${details?.textContent || perror.textContent}`);
        }
        return this.finalizeDOM(doc, this.burl, this.item.mediaType, fxl);
    }

    private buildImageFrame(): string {
        // Rudimentary image display
        const doc = document.implementation.createHTMLDocument(this.item.title || this.item.href);
        const simg = document.createElement("img");
        simg.src = this.burl || "";
        simg.alt = this.item.title || "";
        simg.decoding = "async";
        doc.body.appendChild(simg);
        return this.finalizeDOM(doc, this.burl, this.item.mediaType, true);
    }

    // Has JS that may have side-effects when the document is loaded, without any user interaction
    private hasExecutable(doc: Document): boolean {
        // This is not a 100% comprehensive check of all possibilities for JS execution,
        // but it covers what the prevention scripts cover. Other possibilities include:
        // - <iframe> src
        // - <img> with onload/onerror
        // - <meta http-equiv="refresh" content="xxx">
        return (
            !!doc.querySelector("script") || // Any <script> elements
            !!doc.querySelector("body[onload]:not(body[onload=''])") // <body> that executes JS on load
        );
    }

    private hasStyle(doc: Document): boolean {
        if(
            doc.querySelector("link[rel='stylesheet']") || // Any CSS link
            doc.querySelector("style") || // Any <style> element
            doc.querySelector("[style]:not([style=''])") // Any element with style attribute set
        ) return true;

        return false;
    }

    private finalizeDOM(doc: Document, base: string | undefined, mediaType: MediaType, fxl = false): string {
        if(!doc) return "";

        // Inject styles
        if(!fxl) {
            // Readium CSS Before
            const rcssBefore = styleify(doc, cached("ReadiumCSS-before", () => blobify(stripCSS(readiumCSSBefore), "text/css")));
            doc.head.firstChild ? doc.head.firstChild.before(rcssBefore) : doc.head.appendChild(rcssBefore);

            // Patch
            const patch = doc.createElement("style");
            patch.dataset.readium = "true";
            patch.innerHTML = `audio[controls] { width: revert; height: revert; }`; // https://github.com/readium/readium-css/issues/94
            rcssBefore.after(patch);

            // Readium CSS defaults
            if(!this.hasStyle(doc))
                rcssBefore.after(styleify(doc, cached("ReadiumCSS-default", () => blobify(stripCSS(readiumCSSDefault), "text/css"))))

            // Readium CSS After
            doc.head.appendChild(styleify(doc, cached("ReadiumCSS-after", () => blobify(stripCSS(readiumCSSAfter), "text/css"))));
        }
    
        if(base !== undefined) {
            // Set all URL bases. Very convenient!
            const b = doc.createElement("base");
            b.href = base;
            b.dataset.readium = "true";
            doc.head.firstChild!.before(b);
        }

        // Inject script to prevent in-publication scripts from executing until we want them to
        const hasExecutable = this.hasExecutable(doc);
        if(hasExecutable) doc.head.firstChild!.before(rBefore(doc));
        doc.head.firstChild!.before(cssSelectorGenerator(doc)); // CSS selector utility
        if(hasExecutable) doc.head.appendChild(rAfter(doc)); // Another execution prevention script


        // Make blob from doc
        return URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(doc)], {
              type: mediaType.isHTML
                ? mediaType.string
                : "application/xhtml+xml", // Fallback to XHTML
            })
        );
    }
}