import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { collectStateImageSources } from "../collectStateImageSources";

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
