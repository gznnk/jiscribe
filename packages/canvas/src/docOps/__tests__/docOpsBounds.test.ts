import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

/** Fresh empty CanvasDoc per call, never shared between tests. */
const emptyDoc = (): CanvasDoc => ({ version: 1, root: [] });

/** Default doc-ops, built-in definitions only. */
const docOps = createDocOps();

/** Three rects spread over x 0..500 and y 0..110. */
const threeRects = (): CanvasDoc => {
	const doc = emptyDoc();
	docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
	docOps.addObject(doc, "rect", { x: 130, y: 40, width: 100, height: 60 });
	docOps.addObject(doc, "rect", { x: 400, y: 10, width: 100, height: 100 });
	return doc;
};

describe("getObjectsBounds", () => {
	it("unions every object in the doc when no ids are given", () => {
		expect(docOps.getObjectsBounds(threeRects())).toEqual({
			x: 0,
			y: 0,
			width: 500,
			height: 110,
		});
	});

	it("measures only the ids that were given", () => {
		expect(docOps.getObjectsBounds(threeRects(), ["rect-2"])).toEqual({
			x: 130,
			y: 40,
			width: 100,
			height: 60,
		});
	});

	it("measures a group from its children", () => {
		const doc = threeRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.getObjectsBounds(doc, [groupId])).toEqual({
			x: 0,
			y: 0,
			width: 230,
			height: 100,
		});
	});

	it("returns null for an empty doc", () => {
		expect(docOps.getObjectsBounds(emptyDoc())).toBeNull();
	});

	it("returns null for a doc holding nothing but a connector", () => {
		const doc = threeRects();
		docOps.connect(doc, { sourceId: "rect-1", targetId: "rect-3" });
		// The connector is left dangling: bounds are read without validating the doc.
		doc.root = doc.root.filter((object) => object.type === "connector");

		expect(doc.root).toHaveLength(1);
		expect(docOps.getObjectsBounds(doc)).toBeNull();
	});

	it("returns null for a group with no children", () => {
		const doc = threeRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		// Emptied by hand: groupObjects never builds one, and dropEmptyGroups removes any
		// that an edit leaves behind.
		(doc.root[0] as unknown as { children: ObjectDoc[] }).children = [];

		expect(docOps.getObjectsBounds(doc, [groupId])).toBeNull();
	});

	it("throws DocOperationError for an id the doc does not hold", () => {
		expect(() =>
			docOps.getObjectsBounds(threeRects(), ["rect-1", "nope"]),
		).toThrow(DocOperationError);
	});
});
