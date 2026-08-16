import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	rootIds,
} from "./support/docFixtures";

/** Four rects at the root, drawn in the order they were added. */
const fourRects = (): CanvasDoc => {
	const doc = emptyDoc();
	for (let index = 0; index < 4; index += 1) {
		docOps.addObject(doc, "rect", { x: index * 200, y: 0 });
	}
	return doc;
};

describe("reorderObjects", () => {
	it("brings objects to the end of the array, which is the front of the drawing", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-1"], "front");

		expect(rootIds(doc)).toEqual(["rect-2", "rect-3", "rect-4", "rect-1"]);
		expectValid(doc);
	});

	it("sends objects to the start of the array", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-3"], "back");

		expect(rootIds(doc)).toEqual(["rect-3", "rect-1", "rect-2", "rect-4"]);
	});

	it("steps one place forward, and does nothing once at the front", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-1"], "forward");
		expect(rootIds(doc)).toEqual(["rect-2", "rect-1", "rect-3", "rect-4"]);

		docOps.reorderObjects(doc, ["rect-4"], "forward");
		expect(rootIds(doc)).toEqual(["rect-2", "rect-1", "rect-3", "rect-4"]);
	});

	it("steps one place backward, and does nothing once at the back", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-4"], "backward");
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-4", "rect-3"]);

		docOps.reorderObjects(doc, ["rect-1"], "backward");
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-4", "rect-3"]);
	});

	it("keeps the order objects already had among themselves", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-3", "rect-1"], "front");

		expect(rootIds(doc)).toEqual(["rect-2", "rect-4", "rect-1", "rect-3"]);
	});

	it("moves a run of neighbours as one block when stepping", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-1", "rect-2"], "forward");

		expect(rootIds(doc)).toEqual(["rect-3", "rect-1", "rect-2", "rect-4"]);
	});

	it("reorders inside the group holding the object, never out of it", () => {
		const doc = fourRects();
		docOps.groupObjects(doc, ["rect-1", "rect-2", "rect-3"]);

		docOps.reorderObjects(doc, ["rect-1"], "front");

		const children = readObject(doc, "group-1").children as { id: string }[];
		expect(children.map((child) => child.id)).toEqual([
			"rect-2",
			"rect-3",
			"rect-1",
		]);
		expect(rootIds(doc)).toEqual(["group-1", "rect-4"]);
		expectValid(doc);
	});

	it("reorders ids spread over several parents within their own parent", () => {
		const doc = fourRects();
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		docOps.reorderObjects(doc, ["rect-1", "rect-3"], "front");

		const children = readObject(doc, "group-1").children as { id: string }[];
		expect(children.map((child) => child.id)).toEqual(["rect-2", "rect-1"]);
		expect(rootIds(doc)).toEqual(["group-1", "rect-4", "rect-3"]);
	});

	it("leaves the order untouched when any id is missing", () => {
		const doc = fourRects();

		expect(() =>
			docOps.reorderObjects(doc, ["rect-1", "missing"], "front"),
		).toThrow(DocOperationError);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-3", "rect-4"]);
	});
});

describe("getZOrder", () => {
	it("counts from the back, the last index being the front", () => {
		const doc = fourRects();

		expect(docOps.getZOrder(doc, "rect-1")).toEqual({ index: 0, total: 4 });
		expect(docOps.getZOrder(doc, "rect-4")).toEqual({ index: 3, total: 4 });
	});

	it("follows a restacking", () => {
		const doc = fourRects();

		docOps.reorderObjects(doc, ["rect-1"], "front");

		expect(docOps.getZOrder(doc, "rect-1")).toEqual({ index: 3, total: 4 });
	});

	it("counts a group's child among its siblings, not against the root", () => {
		const doc = fourRects();
		docOps.groupObjects(doc, ["rect-1", "rect-2", "rect-3"]);

		expect(docOps.getZOrder(doc, "rect-3")).toEqual({ index: 2, total: 3 });
		expect(docOps.getZOrder(doc, "group-1")).toEqual({ index: 0, total: 2 });
	});

	it("throws for an id that is not in the doc", () => {
		const doc = fourRects();

		expect(() => docOps.getZOrder(doc, "missing")).toThrow(
			"object not found: missing",
		);
	});
});
