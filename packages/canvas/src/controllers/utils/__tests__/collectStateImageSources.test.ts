import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import {
	collectStateImageSources,
	holdsSameImageSources,
} from "../collectStateImageSources";
import { createCowObjects } from "../cowObjects";

const image = (id: string, src: unknown): ObjectState =>
	({ id, type: "image", src }) as unknown as ObjectState;

const rect = (id: string): ObjectState =>
	({ id, type: "rect" }) as unknown as ObjectState;

describe("collectStateImageSources", () => {
	it("yields nothing for a document with no objects", () => {
		expect(collectStateImageSources({})).toEqual([]);
	});

	it("yields nothing for a document that draws no image", () => {
		expect(collectStateImageSources({ a: rect("a") })).toEqual([]);
	});

	it("yields each src once, in first-seen order", () => {
		const objects = {
			a: image("a", "b.png"),
			b: image("b", "a.png"),
			c: image("c", "b.png"),
		};

		expect(collectStateImageSources(objects)).toEqual(["b.png", "a.png"]);
	});

	it("skips an object whose src is not a string", () => {
		const objects = {
			a: image("a", 42),
			b: image("b", undefined),
			c: image("c", "ok.png"),
		};

		expect(collectStateImageSources(objects)).toEqual(["ok.png"]);
	});

	it("passes a src the path rule would reject through untouched", () => {
		const objects = { a: image("a", "../outside.png") };

		expect(collectStateImageSources(objects)).toEqual(["../outside.png"]);
	});
});

describe("holdsSameImageSources", () => {
	const base = { a: image("a", "a.png"), r: rect("r") };

	it("holds for a view that only moved an image", () => {
		const objects = createCowObjects(base);
		objects.a = { ...base.a, cx: 10 } as ObjectState;

		expect(holdsSameImageSources(objects, base)).toBe(true);
	});

	it("holds for a view that only wrote non-images", () => {
		const objects = createCowObjects(base);
		objects.r = { ...base.r, cx: 10 } as ObjectState;

		expect(holdsSameImageSources(objects, base)).toBe(true);
	});

	it("fails for a view that changed an image's src", () => {
		const objects = createCowObjects(base);
		objects.a = image("a", "b.png");

		expect(holdsSameImageSources(objects, base)).toBe(false);
	});

	it("fails for a view that added an image", () => {
		const objects = createCowObjects(base);
		objects.b = image("b", "b.png");

		expect(holdsSameImageSources(objects, base)).toBe(false);
	});

	it("fails for two plain records, which only a full scan can compare", () => {
		expect(holdsSameImageSources({ ...base }, base)).toBe(false);
	});
});
