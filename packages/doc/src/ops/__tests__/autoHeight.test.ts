import { describe, expect, it } from "vitest";

import { docOps, emptyDoc, readObject } from "./support/docFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";

/**
 * A doc holding one rect that states no height, so its height is the one its text
 * needs. The text is long enough to wrap several times at this width under every
 * measurement backend, the fallback estimate included.
 */
const autoHeightDoc = (
	overrides: Record<string, unknown> = {},
): { doc: CanvasDoc; id: string } => {
	const doc = emptyDoc();
	doc.root.push({
		id: "auto",
		type: "rect",
		x: 40,
		y: 20,
		width: 200,
		text: "a label long enough to take several lines at this width",
		fontSize: 16,
		...overrides,
	} as unknown as ObjectDoc);
	return { doc, id: "auto" };
};

describe("bounds of a shape that states no height", () => {
	it("measures the height its text needs instead of reading 0", () => {
		const { doc, id } = autoHeightDoc();

		const bounds = docOps.getObjectBounds(doc, id);

		expect(bounds).not.toBeNull();
		expect(bounds).toMatchObject({ x: 40, y: 20, width: 200 });
		expect(bounds!.height).toBeGreaterThan(0);
	});

	it("measures a wider box shorter, the text taking fewer lines", () => {
		const narrow = autoHeightDoc({ width: 120 });
		const wide = autoHeightDoc({ width: 400 });

		expect(docOps.getObjectBounds(wide.doc, wide.id)!.height).toBeLessThan(
			docOps.getObjectBounds(narrow.doc, narrow.id)!.height,
		);
	});

	it("measures a larger font taller at the same width", () => {
		const small = autoHeightDoc({ fontSize: 12 });
		const large = autoHeightDoc({ fontSize: 32 });

		expect(docOps.getObjectBounds(large.doc, large.id)!.height).toBeGreaterThan(
			docOps.getObjectBounds(small.doc, small.id)!.height,
		);
	});

	it("carries the derived height into the combined box and the listing", () => {
		const { doc, id } = autoHeightDoc();
		const height = docOps.getObjectBounds(doc, id)!.height;

		expect(docOps.getCombinedBounds(doc)).toEqual({
			x: 40,
			y: 20,
			width: 200,
			height,
		});
		expect(docOps.listObjects(doc)[0].bounds).toEqual({
			x: 40,
			y: 20,
			width: 200,
			height,
		});
	});

	it("aligns against the derived box, not against a flat one", () => {
		const { doc, id } = autoHeightDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 60, height: 40 });
		const height = docOps.getObjectBounds(doc, id)!.height;

		docOps.alignObjects(doc, [id, "rect-1"], "bottom");

		expect(readObject(doc, "rect-1").y).toBe(20 + height - 40);
	});
});

describe("resizing a shape that states no height", () => {
	it("keeps stating none when only the width changes", () => {
		const { doc, id } = autoHeightDoc();
		const tallAt200 = docOps.getObjectBounds(doc, id)!.height;

		docOps.resizeObject(doc, id, { width: 400 });

		expect(readObject(doc, id).height).toBeUndefined();
		expect(docOps.getObjectBounds(doc, id)!.height).toBeLessThan(tallAt200);
	});

	it("writes the height it was drawn at once the height is scaled", () => {
		const { doc, id } = autoHeightDoc();
		const derived = docOps.getObjectBounds(doc, id)!.height;

		docOps.resizeObject(doc, id, { height: derived * 2 });

		expect(readObject(doc, id).height).toBeCloseTo(derived * 2);
	});

	it("keeps stating none while it is only moved", () => {
		const { doc, id } = autoHeightDoc();

		docOps.setPosition(doc, id, { x: 300, y: 500 });

		expect(readObject(doc, id)).toMatchObject({ x: 300, y: 500 });
		expect(readObject(doc, id).height).toBeUndefined();
	});
});

describe("setHeightMode against the derived height", () => {
	it("writes the height the shape was drawn at when switching to fixed", () => {
		const { doc, id } = autoHeightDoc();
		const derived = docOps.getObjectBounds(doc, id)!.height;

		docOps.setHeightMode(doc, [id], { mode: "fixed", height: derived });

		expect(readObject(doc, id).height).toBe(derived);
		expect(docOps.getObjectBounds(doc, id)!.height).toBe(derived);
	});

	it("drops the height again on the way back to auto", () => {
		const { doc, id } = autoHeightDoc({ height: 120 });

		expect(docOps.getObjectBounds(doc, id)!.height).toBe(120);
		docOps.setHeightMode(doc, [id], { mode: "auto" });

		expect(readObject(doc, id).height).toBeUndefined();
		expect(docOps.getObjectBounds(doc, id)!.height).not.toBe(120);
	});
});
