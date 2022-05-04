// (From kotlin-toolkit)
// See https://github.com/JayPanoz/architecture/tree/touch-handling/misc/touch-handling

const interactiveTags = [
    "a",
    "audio",
    "button",
    "canvas",
    "details",
    "input",
    "label",
    "option",
    "select",
    "submit",
    "textarea",
    "video",
];

export default function nearestInteractiveElement(element: Element): Element | null {
    if (interactiveTags.indexOf(element.nodeName.toLowerCase()) !== -1) {
        return element;
    }

    // Checks whether the element is editable by the user.
    if (
      element.hasAttribute("contenteditable") &&
      element.getAttribute("contenteditable").toLowerCase() != "false"
    ) {
        return element;
    }

    // Checks parents recursively because the touch might be for example on an <em> inside a <a>.
    if (element.parentElement) {
        return nearestInteractiveElement(element.parentElement);
    }

    return null;
}