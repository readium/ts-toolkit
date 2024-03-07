const iframeAnchors = {
  top: "js-iframe-reader-top-anchor",
  bottom: "js-iframe-reader-bottom-anchor",
};

export class AnchorObserver extends HTMLElement {
  connectedCallback() {
    this.setAttribute("aria-hidden", "true");
    this.style.setProperty("display", "block", "important");
    this.style.setProperty("padding", "0", "important");
    this.style.setProperty("margin", "0", "important");
    this.style.setProperty("visibility", "hidden", "important");
  }
}

export function helperCreateAnchorElements(iframeElement: HTMLElement) {
  const body = iframeElement.getElementsByTagName("body")[0];
  const anchorTop = document.createElement("anchor-observer");
  const anchorBottom = document.createElement("anchor-observer");
  anchorTop.dataset.readium = "true";
  anchorBottom.dataset.readium = "true";

  anchorTop?.setAttribute("id", iframeAnchors.top);
  anchorTop?.style.setProperty("height", "115px", "important");

  anchorBottom?.setAttribute("id", iframeAnchors.bottom);
  anchorBottom?.style.setProperty("height", "80px", "important");

  body?.insertBefore(anchorTop, body.firstChild);
  body?.appendChild(anchorBottom);
}

export function helperRemoveAnchorElements(iframeElement: HTMLElement) {
  const body = iframeElement.getElementsByTagName("body")[0];
  const anchorTop = body?.querySelector(`#${iframeAnchors.top}`);
  const anchorBottom = body?.querySelector(`#${iframeAnchors.bottom}`);
  if (anchorTop) {
    anchorTop.parentElement?.removeChild(anchorTop);
  }
  if (anchorBottom) {
    anchorBottom.parentElement?.removeChild(anchorBottom);
  }
}