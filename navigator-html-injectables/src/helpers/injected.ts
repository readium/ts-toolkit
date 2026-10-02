// Nodes added to the publication's body by the injectables, left out of the serialized document.
const injected = new WeakSet<Node>();

export function markInjected<T extends Node>(node: T): T {
    injected.add(node);
    return node;
}

export function isInjected(node: Node): boolean {
    return injected.has(node);
}
