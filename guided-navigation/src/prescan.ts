import { extractNodeRoles } from "./roles.ts";
import { isAncestorOf } from "./dom.ts";

function hasEndnotesAncestor(el: Element): boolean {
  for (let p: Element | null = el.parentElement; p; p = p.parentElement) {
    if (extractNodeRoles(p).includes("endnotes")) return true;
  }
  return false;
}

// One pass over root before the real walk: records every element's own id
// (for noteref/pagebreak href resolution), and suppresses a noteref's
// target from also appearing at its original location.
export function prescan(root: Element, ids: Map<string, Element>, suppressed: Set<Element>): void {
  const noterefTargets: { id: string; ref: Element }[] = [];
  const walk = (n: Element, hidden: boolean) => {
    const id = n.getAttribute("id");
    if (id && !ids.has(id)) ids.set(id, n);
    hidden = hidden || n.getAttribute("aria-hidden") === "true" || n.hasAttribute("hidden");
    if (!hidden && n.tagName.toLowerCase() === "a") {
      const roles = extractNodeRoles(n);
      if (roles.includes("noteref")) {
        const href = n.getAttribute("href") ?? "";
        if (href.startsWith("#")) {
          noterefTargets.push({ id: href.slice(1), ref: n });
        }
      }
    }
    for (let c = n.firstElementChild; c; c = c.nextElementSibling) walk(c, hidden);
  };
  walk(root, false);

  for (const target of noterefTargets) {
    const n = ids.get(target.id);
    if (!n) continue;
    if (isAncestorOf(n, target.ref)) continue;
    if (hasEndnotesAncestor(n)) continue;
    suppressed.add(n);
  }
}
