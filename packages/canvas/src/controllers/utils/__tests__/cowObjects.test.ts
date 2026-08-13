import { describe, expect, it } from "vitest";

import {
	collectCowChangedKeys,
	copyObjectsRecord,
	createCowObjects,
	materializeObjects,
} from "../cowObjects";

type Item = { id: string; value: number };

const buildBase = (): Record<string, Item> => ({
	a: { id: "a", value: 1 },
	b: { id: "b", value: 2 },
	c: { id: "c", value: 3 },
});

describe("createCowObjects", () => {
	it("reads fall through to the base map", () => {
		const base = buildBase();
		const view = createCowObjects(base);

		expect(view.a).toBe(base.a);
		expect(view.b).toBe(base.b);
		expect(view.missing).toBeUndefined();
	});

	it("writes are visible on the view but never touch the base", () => {
		const base = buildBase();
		const view = createCowObjects(base);

		const updatedA = { id: "a", value: 10 };
		view.a = updatedA;

		expect(view.a).toBe(updatedA);
		expect(base.a).toEqual({ id: "a", value: 1 });
	});

	it("returns a new reference on every call (per-frame identity)", () => {
		const base = buildBase();

		expect(createCowObjects(base)).not.toBe(base);
		expect(createCowObjects(base)).not.toBe(createCowObjects(base));
	});

	it("supports the in operator and Object.keys with base key order", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };

		expect("a" in view).toBe(true);
		expect("missing" in view).toBe(false);
		expect(Object.keys(view)).toEqual(["a", "b", "c"]);
	});

	it("Object.entries and spread reflect overlay values", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };

		expect(Object.entries(view)).toEqual([
			["a", { id: "a", value: 1 }],
			["b", { id: "b", value: 20 }],
			["c", { id: "c", value: 3 }],
		]);
		expect({ ...view }).toEqual({
			a: { id: "a", value: 1 },
			b: { id: "b", value: 20 },
			c: { id: "c", value: 3 },
		});
	});

	it("keys added on the view appear in enumeration, after base keys", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.d = { id: "d", value: 4 };

		expect(view.d).toEqual({ id: "d", value: 4 });
		expect("d" in view).toBe(true);
		expect(Object.keys(view)).toEqual(["a", "b", "c", "d"]);
		expect("d" in base).toBe(false);
	});

	it("rebases a view over a view onto the same base (no chain build-up)", () => {
		const base = buildBase();
		const firstFrame = createCowObjects(base);
		firstFrame.a = { id: "a", value: 10 };

		const secondFrame = createCowObjects(firstFrame);
		expect(secondFrame.a).toEqual({ id: "a", value: 10 });

		// Writes to the second frame never leak back into the first
		secondFrame.a = { id: "a", value: 100 };
		secondFrame.b = { id: "b", value: 20 };
		expect(firstFrame.a).toEqual({ id: "a", value: 10 });
		expect(firstFrame.b).toEqual({ id: "b", value: 2 });
		expect(base.a).toEqual({ id: "a", value: 1 });
	});

	it("throws on delete to fail fast instead of silently diverging", () => {
		const view = createCowObjects(buildBase());

		expect(() => {
			delete view.a;
		}).toThrow();
	});

	it("serializes like a plain record", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };

		expect(JSON.parse(JSON.stringify(view))).toEqual({ ...view });
	});
});

describe("materializeObjects", () => {
	it("passes a plain record through unchanged (same reference)", () => {
		const base = buildBase();

		expect(materializeObjects(base)).toBe(base);
	});

	it("flattens a view into a plain record with overlay values applied", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };
		view.d = { id: "d", value: 4 };

		const materialized = materializeObjects(view);

		expect(materialized).not.toBe(view);
		expect(materialized).toEqual({
			a: { id: "a", value: 1 },
			b: { id: "b", value: 20 },
			c: { id: "c", value: 3 },
			d: { id: "d", value: 4 },
		});
		// The result is plain: materializing again is a no-op
		expect(materializeObjects(materialized)).toBe(materialized);
		// Unchanged values keep their identity (structural sharing)
		expect(materialized.a).toBe(base.a);
	});
});

describe("copyObjectsRecord", () => {
	it("copies a plain record into a new writable record", () => {
		const base = buildBase();
		const copied = copyObjectsRecord(base);

		copied.a = { id: "a", value: 10 };

		expect(copied).not.toBe(base);
		expect(base.a).toEqual({ id: "a", value: 1 });
		expect(copied.b).toBe(base.b);
	});

	it("copies a view into the plain record the spread would have produced", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };
		view.d = { id: "d", value: 4 };

		const copied = copyObjectsRecord(view);

		expect(copied).toEqual({ ...view });
		// Plain, so nothing downstream keeps reading through the Proxy
		expect(materializeObjects(copied)).toBe(copied);
	});
});

describe("collectCowChangedKeys", () => {
	it("returns null for two plain records (nothing shared to reason about)", () => {
		const base = buildBase();

		expect(collectCowChangedKeys({ ...base }, base)).toBeNull();
	});

	it("returns null when the newer map is a view over an unrelated base", () => {
		const view = createCowObjects(buildBase());

		expect(collectCowChangedKeys(view, buildBase())).toBeNull();
	});

	it("reports the written keys of a view over the previous record", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };
		view.d = { id: "d", value: 4 };

		expect(collectCowChangedKeys(view, base)).toEqual(new Set(["b", "d"]));
	});

	it("is empty when a view wrote nothing", () => {
		const base = buildBase();

		expect(collectCowChangedKeys(createCowObjects(base), base)).toEqual(
			new Set(),
		);
	});

	it("covers both frames' writes when diffing two views over one base", () => {
		const base = buildBase();
		const firstFrame = createCowObjects(base);
		firstFrame.a = { id: "a", value: 10 };
		const secondFrame = createCowObjects(firstFrame);
		secondFrame.b = { id: "b", value: 20 };

		expect(collectCowChangedKeys(secondFrame, firstFrame)).toEqual(
			new Set(["a", "b"]),
		);
	});

	it("covers a key only the older view wrote, so no divergence is missed", () => {
		const base = buildBase();
		const older = createCowObjects(base);
		older.a = { id: "a", value: 10 };
		// Built from the base rather than from `older`, so it does not carry a's write
		const newer = createCowObjects(base);
		newer.b = { id: "b", value: 20 };

		const changedKeys = collectCowChangedKeys(newer, older);

		expect(changedKeys).toEqual(new Set(["a", "b"]));
		// a genuinely differs between the two, and the set does report it
		expect(newer.a).not.toBe(older.a);
	});

	it("every key it omits holds the same reference in both maps", () => {
		const base = buildBase();
		const view = createCowObjects(base);
		view.b = { id: "b", value: 20 };

		const changedKeys = collectCowChangedKeys(view, base);

		for (const key of Object.keys(view)) {
			if (!changedKeys?.has(key)) {
				expect(view[key]).toBe(base[key]);
			}
		}
	});
});
