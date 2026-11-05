// Percent-decodes one component of a URI fragment, after any structured
// fragment has been split on its delimiters. A malformed escape is kept as-is.
export function decodeFragmentComponent(component: string): string {
  return component.replace(/(?:%[0-9A-Fa-f]{2})+/g, (escapes) => {
    try {
      return decodeURIComponent(escapes);
    } catch {
      return escapes;
    }
  });
}
