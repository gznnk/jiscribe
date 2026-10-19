import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { docOps, emptyDoc } from "./support/docFixtures";
import {
	DECLARED_BADGE_BOUNDS,
	declaredBoundsDefinition,
	unsizedPointDefinition,
} from "./support/pluginFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

/** Three rects spread over x 0..500 and y 0..110. */
const threeRects = (): CanvasDoc => {
	const doc = emptyDoc();
	docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
	docOps.addObject(doc, "rect", { x: 130, y: 40, width: 100, height: 60 });
	docOps.addObject(doc, "rect", { x: 400, y: 10, width: 100, height: 100 });
	return doc;
};

describe("getObjectBounds", () => {
	it("measures one object", () => {
		expect(docOps.getObjectBounds(threeRects(), "rect-2")).toEqual({
			x: 130,
			y: 40,
			width: 100,
			height: 60,
		});
	});

	it("measures a group from its children", () => {
		const doc = threeRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.getObjectBounds(doc, groupId)).toEqual({
			x: 0,
			y: 0,
			width: 230,
			height: 100,
		});
	});

	it("returns null for a connector, which has no box of its own", () => {
		const doc = threeRects();
		const connectorId = docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-3",
		});

		expect(docOps.getObjectBounds(doc, connectorId)).toBeNull();
	});

	it("throws DocOperationError for an id the doc does not hold", () => {
		expect(() => docOps.getObjectBounds(threeRects(), "nope")).toThrow(
			DocOperationError,
		);
	});
});

describe("bounds of a point-geometry shape", () => {
	/**
	 * A text as a file states it: the corner it is drawn from, its content, and
	 * nothing about its size.
	 *
	 * @param transform - Written onto the doc as it stands, so a rotation is in degrees
	 */
	const textDoc = (transform: Record<string, unknown> = {}): CanvasDoc => {
		const doc = emptyDoc();
		doc.root.push({
			id: "label",
			type: "text",
			x: 100,
			y: 200,
			text: "hello",
			...transform,
		} as unknown as ObjectDoc);
		return doc;
	};

	/** The box of the upright twin, which every case below is the same size as. */
	const uprightBounds = (): Rect => {
		const bounds = docOps.getObjectBounds(textDoc(), "label");
		expect(bounds).not.toBeNull();
		return bounds!;
	};

	it("measures an upright text from the corner it states", () => {
		expect(uprightBounds()).toMatchObject({ x: 100, y: 200 });
	});

	it("keeps a rotated text's box the size it draws", () => {
		const upright = uprightBounds();
		const rotated = docOps.getObjectBounds(textDoc({ rotation: 90 }), "label");

		expect(rotated?.width).toBe(upright.width);
		expect(rotated?.height).toBe(upright.height);
	});

	it("centres a rotated text's box on the centre its drawn corner names", () => {
		const { width, height } = uprightBounds();

		const rotated = docOps.getObjectBounds(textDoc({ rotation: 90 }), "label");

		// A quarter turn puts the drawn corner half a height to the right of the
		// centre and half a width above it, so the centre — and with it the
		// untransformed box this helper answers with — sits that far the other way.
		expect(rotated?.x).toBeCloseTo(100 - height / 2 - width / 2, 6);
		expect(rotated?.y).toBeCloseTo(200 + width / 2 - height / 2, 6);
	});

	it("reads a flipped text's corner as the box's right edge", () => {
		const { width } = uprightBounds();

		const flipped = docOps.getObjectBounds(textDoc({ flipX: true }), "label");

		expect(flipped?.x).toBeCloseTo(100 - width, 6);
		expect(flipped?.y).toBeCloseTo(200, 6);
	});

	it("has no box for a type that declares none, nothing else stating one", () => {
		const pinDocOps = createDocOps({
			plugins: [{ id: "pin-plugin", objects: { pin: unsizedPointDefinition } }],
		});
		const doc = emptyDoc();
		doc.root.push({ id: "pin-1", type: "pin", x: 10, y: 20 } as ObjectDoc);

		expect(pinDocOps.getObjectBounds(doc, "pin-1")).toBeNull();
	});
});

describe("bounds of a type declaring its own box", () => {
	it("is measured by the declaration rather than by its geometry", () => {
		const badgeDocOps = createDocOps({
			plugins: [
				{ id: "badge-plugin", objects: { badge: declaredBoundsDefinition } },
			],
		});
		const doc = emptyDoc();
		doc.root.push({
			id: "badge-1",
			type: "badge",
			x: 10,
			y: 20,
			width: 100,
			height: 50,
		} as unknown as ObjectDoc);

		expect(badgeDocOps.getObjectBounds(doc, "badge-1")).toEqual(
			DECLARED_BADGE_BOUNDS,
		);
	});
});

describe("getCombinedBounds", () => {
	it("unions every object in the doc when no ids are given", () => {
		expect(docOps.getCombinedBounds(threeRects())).toEqual({
			x: 0,
			y: 0,
			width: 500,
			height: 110,
		});
	});

	it("measures only the ids that were given", () => {
		expect(docOps.getCombinedBounds(threeRects(), ["rect-2"])).toEqual({
			x: 130,
			y: 40,
			width: 100,
			height: 60,
		});
	});

	it("measures a group from its children", () => {
		const doc = threeRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.getCombinedBounds(doc, [groupId])).toEqual({
			x: 0,
			y: 0,
			width: 230,
			height: 100,
		});
	});

	it("returns null for an empty doc", () => {
		expect(docOps.getCombinedBounds(emptyDoc())).toBeNull();
	});

	it("returns null for a doc holding nothing but a connector", () => {
		const doc = threeRects();
		docOps.connect(doc, { sourceId: "rect-1", targetId: "rect-3" });
		// The connector is left dangling: bounds are read without validating the doc.
		doc.root = doc.root.filter((object) => object.type === "connector");

		expect(doc.root).toHaveLength(1);
		expect(docOps.getCombinedBounds(doc)).toBeNull();
	});

	it("returns null for a group with no children", () => {
		const doc = threeRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		// Emptied by hand: groupObjects never builds one, and dropEmptyGroups removes any
		// that an edit leaves behind.
		(doc.root[0] as unknown as { children: ObjectDoc[] }).children = [];

		expect(docOps.getCombinedBounds(doc, [groupId])).toBeNull();
	});

	it("throws DocOperationError for an id the doc does not hold", () => {
		expect(() =>
			docOps.getCombinedBounds(threeRects(), ["rect-1", "nope"]),
		).toThrow(DocOperationError);
	});
});
