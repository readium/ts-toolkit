/**
 * Returns the "content width" of an element, which is its clientWidth
 * minus any horizontal padding.
 *
 * @param el - The element to measure.
 */
export function getContentWidth(el: Element) {
  const cStyle = getComputedStyle(el);
  const paddingLeft = parseFloat(cStyle.paddingLeft || "0");
  const paddingRight = parseFloat(cStyle.paddingRight || "0");
  return el.clientWidth - paddingLeft - paddingRight;
}

