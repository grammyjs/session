import { assertEquals } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { _MUTATED, _TRACKED, isTracked, trackMutations } from "../proxy.ts";

describe("trackMutations", () => {
    it("correctly sets the tracked symbol", () => {
        const trackedState = trackMutations({});

        assertEquals(trackedState[_TRACKED], true);
    });

    it("correctly tracks mutations wether they exist or not", () => {
        const mutated = trackMutations({ count: 0 });
        const nonMutated = trackMutations({ count: 0 });

        mutated.count++;

        assertEquals(mutated[_MUTATED], true);
        assertEquals(nonMutated[_MUTATED], false);
    });

    it("keeps property references", () => {
        const ctx = { session: trackMutations({ obj: { count: 0 } }) };
        const old = ctx.session.obj;
        ctx.session.obj.count++;
        assertEquals(old, ctx.session.obj);
    });

    describe("arrays", () => {
        it("tracks direct assignmend", () => {
            const tracked = trackMutations([] as number[]);
            tracked[0] = 1;

            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks direct deletion", () => {
            const tracked = trackMutations([1]);
            delete tracked[0];

            assertEquals(tracked[_MUTATED], true);
        });

        describe("tracks mutations via methods", () => {
            it("tracks mutations via push", () => {
                const tracked = trackMutations([] as number[]);
                tracked.push(1);
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via pop", () => {
                const tracked = trackMutations([1] as number[]);
                tracked.pop();
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via shift", () => {
                const tracked = trackMutations([1] as number[]);
                tracked.shift();
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via unshift", () => {
                const tracked = trackMutations([] as number[]);
                tracked.unshift(1);
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via splice", () => {
                const tracked = trackMutations([1, 2, 3] as number[]);
                tracked.splice(1, 1, 9);
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via sort", () => {
                const tracked = trackMutations([3, 2, 1] as number[]);
                tracked.sort();
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via reverse", () => {
                const tracked = trackMutations([1, 2, 3] as number[]);
                tracked.reverse();
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via copyWithin", () => {
                const tracked = trackMutations([1, 2, 3] as number[]);
                tracked.copyWithin(0, 1);
                assertEquals(tracked[_MUTATED], true);
            });

            it("tracks mutations via fill", () => {
                const tracked = trackMutations([1, 2, 3] as number[]);
                tracked.fill(0);
                assertEquals(tracked[_MUTATED], true);
            });
        });
    });

    describe("objects", () => {
        it("tracks direct property assignment", () => {
            const tracked = trackMutations({} as Record<string, number>);
            tracked.foo = 42;
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks property deletion", () => {
            const tracked = trackMutations(
                { foo: 1 } as Record<string, number>,
            );
            delete tracked.foo;
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks property assignment via defineProperty", () => {
            const tracked = trackMutations(
                { foo: 1 } as Record<string, number>,
            );
            Object.defineProperty(tracked, "bar", {
                get() {
                    return 2;
                },
            });
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks property assignment via Object.assign", () => {
            const tracked = trackMutations(
                { foo: 1 } as Record<string, number>,
            );
            Object.assign(tracked, { bar: 2 });
            assertEquals(tracked[_MUTATED], true);
            assertEquals(tracked.bar, 2);
        });

        it("tracks new properties", () => {
            const tracked = trackMutations(
                { foo: { bar: 1 } } as Record<string, Record<string, number>>,
            );
            let target = {};

            Object.defineProperty(tracked, "baz", {
                get() {
                    return target;
                },
                set(v) {
                    target = v;
                },
            });

            tracked.baz.count = 0;

            assertEquals(tracked[_MUTATED], true);
            assertEquals(tracked.baz.count, 0);
        });
    });

    describe("Map", () => {
        it("tracks set", () => {
            const tracked = trackMutations(new Map<string, number>());
            tracked.set("a", 1);
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks delete", () => {
            const tracked = trackMutations(new Map([["a", 1]]));
            tracked.delete("a");
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks clear", () => {
            const tracked = trackMutations(new Map([["a", 1], ["b", 2]]));
            tracked.clear();
            assertEquals(tracked[_MUTATED], true);
        });
    });

    describe("Set", () => {
        it("tracks add", () => {
            const tracked = trackMutations(new Set<number>());
            tracked.add(1);
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks delete", () => {
            const tracked = trackMutations(new Set([1]));
            tracked.delete(1);
            assertEquals(tracked[_MUTATED], true);
        });

        it("tracks clear", () => {
            const tracked = trackMutations(new Set([1, 2]));
            tracked.clear();
            assertEquals(tracked[_MUTATED], true);
        });
    });
});

describe("isTracked", () => {
    it("returns true for tracked objects", () => {
        const tracked = { [_TRACKED]: true };

        assertEquals(isTracked(tracked), true);
    });

    describe("behavior for non tracked objects", () => {
        it("returns false for primitives", () => {
            assertEquals(isTracked(undefined), false);
            assertEquals(isTracked(null), false);
            assertEquals(isTracked(0), false);
            assertEquals(isTracked(""), false);
            assertEquals(isTracked(true), false);
            assertEquals(isTracked(0n), false);
            assertEquals(isTracked(Symbol()), false);
        });

        it("returns false for objects", () => {
            assertEquals(isTracked([]), false);
            assertEquals(isTracked({}), false);
            assertEquals(isTracked(new Date()), false);
            assertEquals(isTracked(Object.create(null)), false);
        });
    });
});
