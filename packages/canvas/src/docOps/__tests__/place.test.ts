import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	twoConnectedRects,
	twoRects,
} from "./support/docFixtures";

describe("moveObject / translateObjects", () => {
	it("moves a rect to an absolute top-left, one axis at a time", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 10, y: 20, width: 100, height: 50 });

		docOps.moveObject(doc, "rect-1", { x: 400 });

		expect(readObject(doc, "rect-1")).toMatchObject({ x: 400, y: 20 });
	});

	it("moves a center-based ellipse by its bounding box", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "ellipse", {
			x: 0,
			y: 0,
			width: 160,
			height: 100,
		});

		docOps.moveObject(doc, "ellipse-1", { x: 100, y: 200 });

		// Top-left (100, 200) with a 160x100 box gives center (180, 250).
		expect(readObject(doc, "ellipse-1")).toMatchObject({ cx: 180, cy: 250 });
	});

	it("shifts a whole cluster without disturbing the gaps inside it", () => {
		const doc = twoConnectedRects();

		docOps.translateObjects(doc, ["rect-1", "rect-2"], 50, -20);

		expect(readObject(doc, "rect-1")).toMatchObject({ x: 50, y: -20 });
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 350, y: -20 });
	});

	it("refuses a connector, which follows the objects it joins", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.moveObject(doc, "connector-1", { x: 0 })).toThrow(
			/connector/,
		);
	});

	it("leaves the cluster untouched when one member cannot be moved", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.translateObjects(doc, ["rect-1", "connector-1"], 50, 0),
		).toThrow(DocOperationError);
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 0 });
	});
});

describe("moveObjects", () => {
	it("places each object at its own absolute top-left", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
		docOps.addObject(doc, "ellipse", { x: 0, y: 0, width: 100, height: 100 });

		docOps.moveObjects(doc, [
			{ id: "rect-1", x: 400 },
			{ id: "ellipse-1", x: 10, y: 20 },
		]);

		// An omitted axis leaves that object where it was.
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 400, y: 0 });
		expect(readObject(doc, "ellipse-1")).toMatchObject({ cx: 60, cy: 70 });
		expectValid(doc);
	});

	it("lets the last entry for a repeated id decide", () => {
		const doc = twoRects();

		docOps.moveObjects(doc, [
			{ id: "rect-1", x: 100 },
			{ id: "rect-1", x: 200, y: 50 },
		]);

		expect(readObject(doc, "rect-1")).toMatchObject({ x: 200, y: 50 });
	});

	it("leaves the doc untouched when one entry cannot be positioned", () => {
		const doc = twoConnectedRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.moveObjects(doc, [
				{ id: "rect-1", x: 50 },
				{ id: "connector-1", x: 50 },
			]),
		).toThrow(
			"entries[1] (connector-1): connector-1 is a connector: it follows the objects it joins, so move or resize those instead — the document was left unchanged",
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("leaves the doc untouched when an id is missing, naming every one at once", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.moveObjects(doc, [
				{ id: "rect-1", x: 50 },
				{ id: "gone-1", x: 50 },
				{ id: "gone-2", x: 50 },
			]),
		).toThrow("object not found: gone-1, gone-2");
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op for an empty array", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		docOps.moveObjects(doc, []);

		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches moveObject for a single entry", () => {
		const singleDoc = twoRects();
		docOps.moveObject(singleDoc, "rect-2", { x: 40, y: 80 });

		const batchDoc = twoRects();
		docOps.moveObjects(batchDoc, [{ id: "rect-2", x: 40, y: 80 }]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

describe("resizeObject", () => {
	it("resizes a rect around its top-left corner", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 10, y: 20, width: 100, height: 50 });

		docOps.resizeObject(doc, "rect-1", { width: 300 });

		expect(readObject(doc, "rect-1")).toMatchObject({
			x: 10,
			y: 20,
			width: 300,
			height: 50,
		});
	});

	it("keeps an ellipse's top-left while changing its radii", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "ellipse", { x: 0, y: 0, width: 100, height: 100 });

		docOps.resizeObject(doc, "ellipse-1", { width: 200, height: 50 });

		expect(readObject(doc, "ellipse-1")).toMatchObject({
			cx: 100,
			cy: 25,
			rx: 100,
			ry: 25,
		});
	});

	it("scales a group's children so their gaps scale with the box", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 200, y: 0, width: 100, height: 100 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		docOps.resizeObject(doc, groupId, { width: 600 });

		expect(readObject(doc, "rect-1")).toMatchObject({ x: 0, width: 200 });
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 400, width: 200 });
	});

	it("rejects a size that is not greater than 0", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() => docOps.resizeObject(doc, "rect-1", { width: 0 })).toThrow(
			DocOperationError,
		);
	});
});

describe("resizeObjects", () => {
	it("gives every id the same size and keeps the omitted axis per object", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 300, y: 0, width: 100, height: 40 });

		docOps.resizeObjects(doc, ["rect-1", "rect-2"], { width: 200 });

		expect(readObject(doc, "rect-1")).toMatchObject({
			width: 200,
			height: 100,
		});
		expect(readObject(doc, "rect-2")).toMatchObject({ width: 200, height: 40 });
		expectValid(doc);
	});

	it("counts a repeated id once, rather than scaling it twice", () => {
		const doc = twoRects();

		docOps.resizeObjects(doc, ["rect-1", "rect-1"], { width: 200 });

		expect(readObject(doc, "rect-1")).toMatchObject({
			width: 200,
			height: 100,
		});
	});

	it("leaves the doc untouched when one id cannot be sized", () => {
		const doc = twoConnectedRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.resizeObjects(doc, ["rect-1", "connector-1"], { width: 20 }),
		).toThrow(
			"ids[1] (connector-1): connector-1 is a connector: it follows the objects it joins, so move or resize those instead — the document was left unchanged",
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	// The repeat is dropped before the objects are planned, so the reported index has to
	// be looked up in the caller's array rather than taken from the deduplicated one.
	it("reports the failing entry at its place in the caller's own array", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.resizeObjects(doc, ["rect-1", "rect-1", "connector-1"], {
				width: 20,
			}),
		).toThrow("ids[2] (connector-1): ");
	});

	it("leaves the doc untouched for a size that is not greater than 0", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.resizeObjects(doc, ["rect-1", "rect-2"], { height: 0 }),
		).toThrow(
			"ids[0] (rect-1): rect-1 cannot be resized to 100x0: both sides must be greater than 0 — the document was left unchanged",
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op for an empty array", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		docOps.resizeObjects(doc, [], { width: 200 });

		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches resizeObject for a single id", () => {
		const singleDoc = twoRects();
		docOps.resizeObject(singleDoc, "rect-2", { width: 250, height: 30 });

		const batchDoc = twoRects();
		docOps.resizeObjects(batchDoc, ["rect-2"], { width: 250, height: 30 });

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

describe("objects measured from their points", () => {
	/** A polygon whose factory vertices are replaced by a plain 100x60 triangle. */
	const triangleDoc = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "polygon", { x: 0, y: 0 });
		readObject(doc, "polygon-1").points = [
			{ x: 10, y: 20 },
			{ x: 110, y: 20 },
			{ x: 60, y: 80 },
		];
		return doc;
	};

	it("move by shifting every vertex, measured from the box the points span", () => {
		const doc = triangleDoc();

		docOps.moveObject(doc, "polygon-1", { x: 100, y: 0 });

		expect(readObject(doc, "polygon-1").points).toEqual([
			{ x: 100, y: 0 },
			{ x: 200, y: 0 },
			{ x: 150, y: 60 },
		]);
		expectValid(doc);
	});

	it("resize about that box's top-left, which is a vertex only by chance", () => {
		const doc = triangleDoc();

		docOps.resizeObject(doc, "polygon-1", { width: 200, height: 120 });

		expect(readObject(doc, "polygon-1").points).toEqual([
			{ x: 10, y: 20 },
			{ x: 210, y: 20 },
			{ x: 110, y: 140 },
		]);
	});

	it("cannot be resized once flat on an axis, with nothing to scale up from", () => {
		const doc = triangleDoc();
		readObject(doc, "polygon-1").points = [
			{ x: 40, y: 0 },
			{ x: 40, y: 100 },
		];

		expect(() => docOps.resizeObject(doc, "polygon-1", { width: 80 })).toThrow(
			/zero-width or zero-height/,
		);
	});
});
