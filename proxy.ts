/**
 * @internal Symbol used to track if the object has been mutated
 */
export const _MUTATED = Symbol("mutated");

/**
 * @internal Symbol used to track if the object is being tracked
 */
export const _TRACKED = Symbol("tracked");

type Mutatable<T> = T & { [_MUTATED]?: boolean; [_TRACKED]?: boolean };

// for Set, Map, and Array
const MUTATION_METHODS = new Set([
    "set",
    "add",
    "delete",
    "clear",
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
    "fill",
    "copyWithin",
]);

/**
 * @internal Creates a proxy wrapper around an object to track mutations
 * @param object - The target object to proxify
 * @returns Proxied object that tracks mutations
 */
export function trackMutations<T>(
    object: T,
): Mutatable<T> {
    if (typeof object !== "object" || object === null) {
        return object as Mutatable<T>;
    }

    const proxyCache = new WeakMap();

    let hasChanges = false;

    // deno-lint-ignore no-explicit-any
    const handler: ProxyHandler<any> = {
        get(target, prop) {
            if (prop === _TRACKED) return true;
            if (prop === _MUTATED) return hasChanges;
            const originalValue = Reflect.get(target, prop);

            if (hasChanges) {
                // Skip proxification if there are changes already
                return originalValue;
            }

            if (typeof originalValue === "object" && originalValue !== null) {
                if (proxyCache.has(originalValue)) {
                    return proxyCache.get(originalValue);
                }
                const proxied = new Proxy(originalValue, handler);
                proxyCache.set(originalValue, proxied);
                return proxied;
            }

            if (typeof originalValue === "function") {
                return (...args: unknown[]) => {
                    if (MUTATION_METHODS.has(String(prop))) {
                        hasChanges = true;
                    }
                    return Reflect.apply(originalValue, target, args);
                };
            }

            return Reflect.get(target, prop);
        },
        set(target, prop: string, value) {
            hasChanges = true;
            return Reflect.set(target, prop, value);
        },
        deleteProperty(target, prop) {
            hasChanges = true;
            return Reflect.deleteProperty(target, prop);
        },
        defineProperty(target, prop, descriptor) {
            hasChanges = true;
            return Reflect.defineProperty(target, prop, descriptor);
        },
    };

    try {
        return new Proxy(object, handler);
    } catch (e) {
        console.log(
            `Error proxifying ${object} of type ${typeof object}: ${e}`,
        );
        throw e;
    }
}

/**
 * @internal Checks if the object has been mutated
 */
export function hasMutations(object: unknown) {
    return isTracked(object) && object[_MUTATED] === true;
}

/**
 * @internal Checks if the object is being tracked
 */
// deno-lint-ignore no-explicit-any
export function isTracked<T>(object: any): object is Mutatable<T> {
    return Boolean(object) && object[_TRACKED] === true;
}
