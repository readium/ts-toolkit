import type { ObjBuilder } from "./object.ts";

const SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;
// Placeholder origin so URL can resolve relative paths; stripped from the result.
const BASE = "https://gnd.invalid/";

// Resolves a ref found in the resource at `href` against it, keeping the result relative to the same base as `href`.
export function resolveRef(ref: string, href: string): string {
  if (SCHEME_RE.test(ref)) return ref;
  // The fragment is kept verbatim: URL parsing would re-encode textref fragments.
  const hashIndex = ref.indexOf("#");
  const path = hashIndex === -1 ? ref : ref.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : ref.slice(hashIndex);
  if (SCHEME_RE.test(href)) return new URL(path, href).href + fragment;
  const resolved = new URL(path, BASE + href.replace(/^\/+/, "")).href;
  return resolved.startsWith(BASE) ? resolved.slice(BASE.length) + fragment : ref;
}

export function resolveRefs(o: ObjBuilder, href: string): void {
  if (o.textref) o.textref = resolveRef(o.textref, href);
  if (o.imgref) o.imgref = resolveRef(o.imgref, href);
  if (o.audioref) o.audioref = resolveRef(o.audioref, href);
  if (o.videoref) o.videoref = resolveRef(o.videoref, href);
  o.children?.forEach((c) => resolveRefs(c, href));
}
