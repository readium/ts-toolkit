// Returns a function that runs operations one after another, even when one rejects
export function createSerializer() {
    let queue: Promise<unknown> = Promise.resolve();
    return <T>(operation: () => Promise<T>): Promise<T> => {
        const result = queue.then(operation);
        queue = result.catch(() => {});
        return result;
    };
}
