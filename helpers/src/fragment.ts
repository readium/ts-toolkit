// Percent-decodes one component of a URI fragment, after any structured
// fragment has been split on its delimiters. A malformed escape is kept as-is.
export function decodeFragmentComponent(component: string): string {
  try {
    return decodeURIComponent(component);
  } catch {
    return component;
  }
}
