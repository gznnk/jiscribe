import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { parseCanvasText } from "../../schemas/canvas/validators";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ObjectDocDefinition } from "../../schemas/plugin/ObjectDocDefinition";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

/** Fresh empty CanvasDoc per call, never shared between tests. */
const emptyDoc = (): CanvasDoc => ({ version: 1, root: [] });

/** Serialize the doc, run it through validation, and assert it is valid. */
const expectValid = (doc: CanvasDoc) => {
	const result = parseCanvasText(`${JSON.stringify(doc, null, "\t")}\n`);
	expect(result.kind).toBe("ok");
};

/** Read one object back as a plain record, failing the test when the id is gone. */
const readObject = (doc: CanvasDoc, id: string): Record<string, unknown> => {
	const find = (
		objects: readonly ObjectDoc[],
	): Record<string, unknown> | undefined => {
		for (const object of objects) {
			if (object.id === id) {
				return object as Record<string, unknown>;
			}
			const children = (object as { children?: ObjectDoc[] }).children;
			const found = Array.isArray(children) ? find(children) : undefined;
			if (found !== undefined) {
				return found;
			}
		}
		return undefined;
	};
	const found = find(doc.root);
	expect(found, `object ${id} should exist`).toBeDefined();
	return found as Record<string, unknown>;
};

const rootIds = (doc: CanvasDoc): string[] =>
	doc.root.map((object) => object.id);

/** Default doc-ops, built-in definitions only. */
const docOps = createDocOps();

/** Two rects joined by a connector — the starting point for most edits below. */
const twoConnectedRects = (): CanvasDoc => {
	const doc = emptyDoc();
	docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
	docOps.addObject(doc, "rect", { x: 300, y: 0, width: 100, height: 100 });
	docOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
	return doc;
};

describe("addObject with styling", () => {
	it("overrides the factory defaults and keeps the doc valid", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", {
			x: 0,
			y: 0,
			text: "step",
			fill: "#ffeeba",
			stroke: "#856404",
			strokeWidth: 3,
			fontColor: "#856404",
			fontSize: 20,
		});

		expect(readObject(doc, "rect-1")).toMatchObject({
			fill: "#ffeeba",
			stroke: "#856404",
			strokeWidth: 3,
			fontColor: "#856404",
			fontSize: 20,
		});
		expectValid(doc);
	});
});

describe("deleteObjects", () => {
	it("removes the named objects and the connectors left dangling", () => {
		const doc = twoConnectedRects();

		const result = docOps.deleteObjects(doc, ["rect-2"]);

		expect(result.deletedIds).toEqual(["rect-2", "connector-1"]);
		expect(result.cascadedIds).toEqual(["connector-1"]);
		expect(rootIds(doc)).toEqual(["rect-1"]);
		expectValid(doc);
	});

	it("takes a group's children with it and drops the group when emptied", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.deleteObjects(doc, [groupId]).deletedIds).toEqual([
			groupId,
			"rect-1",
			"rect-2",
		]);
		expect(doc.root).toHaveLength(0);
	});

	it("leaves the doc untouched when any id is missing", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.deleteObjects(doc, ["rect-1", "missing"])).toThrow(
			DocOperationError,
		);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "connector-1"]);
	});
});

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

describe("setStyle", () => {
	it("colours a shape and reports nothing ignored", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		const result = docOps.setStyle(doc, ["rect-1"], {
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});

		expect(result).toEqual({ styledIds: ["rect-1"], ignored: [] });
		expect(readObject(doc, "rect-1")).toMatchObject({
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});
		expectValid(doc);
	});

	it("styles the line of a connector and reports the rest as ignored", () => {
		const doc = twoConnectedRects();

		const result = docOps.setStyle(doc, ["connector-1"], {
			stroke: "#c62828",
			strokeDashType: "dashed",
			fill: "#ffffff",
		});

		expect(readObject(doc, "connector-1")).toMatchObject({
			stroke: "#c62828",
			strokeDashType: "dashed",
		});
		// A connector's fill belongs to its label, and this one has none yet.
		expect(result.ignored).toEqual([
			{ id: "connector-1", properties: ["fill"] },
		]);
		expectValid(doc);
	});

	it("sends a connector's fill and typography to its label once it has one", () => {
		const doc = twoConnectedRects();
		docOps.setText(doc, "connector-1", "yes");

		const result = docOps.setStyle(doc, ["connector-1"], {
			fill: "#ffffff",
			fontSize: 12,
		});

		expect(readObject(doc, "connector-1").label).toMatchObject({
			text: "yes",
			fill: "#ffffff",
			fontSize: 12,
		});
		expect(result.ignored).toEqual([]);
		expectValid(doc);
	});

	it("leaves every object untouched when any id is missing", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.setStyle(doc, ["rect-1", "missing"], { fill: "#000000" }),
		).toThrow(DocOperationError);
		expect(readObject(doc, "rect-1").fill).not.toBe("#000000");
	});
});

describe("setText", () => {
	it("rewrites a single-body shape's text", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "yes" });

		docOps.setText(doc, "rect-1", "yes (2FA off)");

		expect(readObject(doc, "rect-1").text).toBe("yes (2FA off)");
		expectValid(doc);
	});

	it("labels a connector, and drops the label when set to empty", () => {
		const doc = twoConnectedRects();

		docOps.setText(doc, "connector-1", "on failure");
		expect(readObject(doc, "connector-1").label).toEqual({
			text: "on failure",
		});
		expectValid(doc);

		docOps.setText(doc, "connector-1", "");
		expect(readObject(doc, "connector-1").label).toBeUndefined();
	});

	it("refuses a type that holds no text", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(() => docOps.setText(doc, groupId, "nope")).toThrow(
			DocOperationError,
		);
	});
});

describe("setText on a slotted type", () => {
	// The dependency direction stops a canvas test from importing the uml plugin, so
	// stand in a minimal `text: "slots"` definition with the same doc shape.
	const cardDefinition: ObjectDocDefinition = {
		features: {
			type: "slot-card",
			geometry: "rect",
			text: "slots",
			connectable: true,
		},
		validateDoc: () => [],
	};
	const slotOps = createDocOps({
		plugins: [{ id: "slot-plugin", objects: { "slot-card": cardDefinition } }],
	});
	const slottedDoc = (): CanvasDoc => ({
		version: 1,
		root: [
			{
				id: "card-1",
				type: "slot-card",
				x: 0,
				y: 0,
				width: 180,
				height: 90,
				text: {
					name: { text: "User" },
					attributes: { text: ["id", "email"] },
				},
			} as unknown as ObjectDoc,
		],
	});

	it("writes a string slot as it is and a rows slot one line per row", () => {
		const doc = slottedDoc();

		slotOps.setText(doc, "card-1", "Account", "name");
		slotOps.setText(doc, "card-1", "id\nemail\nrole", "attributes");

		expect(readObject(doc, "card-1").text).toEqual({
			name: { text: "Account" },
			attributes: { text: ["id", "email", "role"] },
		});
	});

	it("names the available slots when the slot is missing or unknown", () => {
		const doc = slottedDoc();

		expect(() => slotOps.setText(doc, "card-1", "x")).toThrow(
			/name \/ attributes/,
		);
		expect(() => slotOps.setText(doc, "card-1", "x", "operations")).toThrow(
			/name \/ attributes/,
		);
	});

	it("styles every slot at once", () => {
		const doc = slottedDoc();

		slotOps.setStyle(doc, ["card-1"], { fontSize: 18 });

		expect(readObject(doc, "card-1").text).toMatchObject({
			name: { fontSize: 18 },
			attributes: { fontSize: 18 },
		});
	});
});

describe("updateConnector", () => {
	it("re-attaches an end to another object", () => {
		const doc = twoConnectedRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0 });

		docOps.updateConnector(doc, "connector-1", { targetId: "rect-3" });

		expect(readObject(doc, "connector-1").target).toEqual({
			owner: { id: "rect-3" },
			anchor: { kind: "center" },
		});
		expectValid(doc);
	});

	it("keeps the owner when only the anchor moves", () => {
		const doc = twoConnectedRects();

		docOps.updateConnector(doc, "connector-1", {
			sourceAnchor: "rightCenter",
			targetAnchor: "leftCenter",
		});

		expect(readObject(doc, "connector-1").source).toEqual({
			owner: { id: "rect-1" },
			anchor: { kind: "connectPoint", id: "rightCenter" },
		});
		expectValid(doc);
	});

	it("takes explicit waypoints as the route", () => {
		const doc = twoConnectedRects();

		docOps.updateConnector(doc, "connector-1", {
			routing: "orthogonal",
			points: [
				{ x: 150, y: 50 },
				{ x: 150, y: 200 },
				{ x: 350, y: 200 },
			],
		});

		expect(readObject(doc, "connector-1")).toMatchObject({
			routing: "orthogonal",
			points: [
				{ x: 150, y: 50 },
				{ x: 150, y: 200 },
				{ x: 350, y: 200 },
			],
		});
		expectValid(doc);

		docOps.updateConnector(doc, "connector-1", { points: [] });
		expect(readObject(doc, "connector-1").points).toEqual([]);
	});

	it("re-derives the routing only for a connector that never stored one", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });
		// Two connectPoints leave routing off the doc entirely.
		docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			sourceAnchor: "rightCenter",
			targetAnchor: "leftCenter",
		});

		docOps.updateConnector(doc, "connector-1", { targetAnchor: "center" });
		expect(readObject(doc, "connector-1").routing).toBe("straight");

		// Now that "straight" is stored, re-anchoring must not silently undo it.
		docOps.updateConnector(doc, "connector-1", { targetAnchor: "leftCenter" });
		expect(readObject(doc, "connector-1").routing).toBe("straight");
	});

	it("places the label, and refuses to place one that does not exist", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.updateConnector(doc, "connector-1", { labelPosition: 0.3 }),
		).toThrow(DocOperationError);

		docOps.setText(doc, "connector-1", "yes");
		docOps.updateConnector(doc, "connector-1", {
			labelPosition: 0.3,
			labelOffset: -12,
		});

		expect(readObject(doc, "connector-1").label).toMatchObject({
			position: 0.3,
			offset: -12,
		});
		expectValid(doc);
	});

	it("refuses an id that is not a connector", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.updateConnector(doc, "rect-1", {})).toThrow(
			/not a connector/,
		);
	});
});

describe("alignObjects / distributeObjects", () => {
	const threeRects = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 130, y: 40, width: 100, height: 60 });
		docOps.addObject(doc, "rect", { x: 400, y: 10, width: 100, height: 100 });
		return doc;
	};

	it("lines objects up on one edge without touching the other axis", () => {
		const doc = threeRects();

		docOps.alignObjects(doc, ["rect-1", "rect-2", "rect-3"], "top");

		expect(readObject(doc, "rect-2")).toMatchObject({ x: 130, y: 0 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 400, y: 0 });
	});

	it("centers objects on the selection's own midline", () => {
		const doc = threeRects();

		docOps.alignObjects(doc, ["rect-1", "rect-3"], "centerY");

		// The union spans y 0..110, so both centres land on 55.
		expect(readObject(doc, "rect-1")).toMatchObject({ y: 5 });
		expect(readObject(doc, "rect-3")).toMatchObject({ y: 5 });
	});

	it("spreads objects evenly between the outermost two", () => {
		const doc = threeRects();

		docOps.distributeObjects(doc, ["rect-1", "rect-2", "rect-3"], "horizontal");

		// 0..500 span, 300px of shapes, so each of the two gaps is 100.
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 200 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 400 });
	});

	it("uses a fixed gap when one is given, keeping the first object in place", () => {
		const doc = threeRects();

		docOps.distributeObjects(
			doc,
			["rect-1", "rect-2", "rect-3"],
			"horizontal",
			20,
		);

		expect(readObject(doc, "rect-2")).toMatchObject({ x: 120 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 240 });
	});

	it("needs three objects to spread without a gap, and two with one", () => {
		const doc = threeRects();

		expect(() =>
			docOps.distributeObjects(doc, ["rect-1", "rect-2"], "horizontal"),
		).toThrow(DocOperationError);
		expect(() =>
			docOps.distributeObjects(doc, ["rect-1", "rect-2"], "horizontal", 40),
		).not.toThrow();
	});
});

describe("groupObjects / ungroupObject", () => {
	it("wraps siblings in a group at the earliest member's place", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });

		const groupId = docOps.groupObjects(doc, ["rect-3", "rect-1"]);

		expect(groupId).toBe("group-1");
		expect(rootIds(doc)).toEqual(["group-1", "rect-2"]);
		expect(
			(readObject(doc, "group-1").children as ObjectDoc[]).map(
				(child) => child.id,
			),
		).toEqual(["rect-1", "rect-3"]);
		expectValid(doc);
	});

	it("keeps a connector to a grouped object working", () => {
		const doc = twoConnectedRects();

		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(rootIds(doc)).toEqual(["group-1", "connector-1"]);
		expectValid(doc);
	});

	it("puts the children back where the group was", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.ungroupObject(doc, groupId)).toEqual(["rect-1", "rect-2"]);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-3"]);
		expectValid(doc);
	});

	it("refuses to group a connector", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.groupObjects(doc, ["rect-1", "connector-1"])).toThrow(
			/connector/,
		);
	});
});

describe("addObjectsToGroup / removeObjectsFromGroup", () => {
	/** A group of two rects, with two more rects left outside it. */
	const groupedPair = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400, 600]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		return doc;
	};

	const childIds = (doc: CanvasDoc, groupId: string): string[] =>
		(readObject(doc, groupId).children as ObjectDoc[]).map((child) => child.id);

	it("appends the newcomers to the group in the order given", () => {
		const doc = groupedPair();

		expect(
			docOps.addObjectsToGroup(doc, "group-1", ["rect-4", "rect-3"]),
		).toEqual([]);
		expect(rootIds(doc)).toEqual(["group-1"]);
		expect(childIds(doc, "group-1")).toEqual([
			"rect-1",
			"rect-2",
			"rect-4",
			"rect-3",
		]);
		expectValid(doc);
	});

	it("drops a group the move left empty", () => {
		const doc = groupedPair();
		docOps.groupObjects(doc, ["rect-3", "rect-4"]);

		expect(
			docOps.addObjectsToGroup(doc, "group-1", ["rect-3", "rect-4"]),
		).toEqual(["group-2"]);
		expect(rootIds(doc)).toEqual(["group-1"]);
		expect(childIds(doc, "group-1")).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
			"rect-4",
		]);
		expectValid(doc);
	});

	it("refuses a connector, a move into itself, and an unknown id — without moving anything", () => {
		const doc = twoConnectedRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0 });
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(() =>
			docOps.addObjectsToGroup(doc, "group-1", ["connector-1"]),
		).toThrow(/connector/);
		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["group-1"])).toThrow(
			/inside itself/,
		);
		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["rect-9"])).toThrow(
			DocOperationError,
		);
		expect(() => docOps.addObjectsToGroup(doc, "rect-3", ["rect-3"])).toThrow(
			/not a group/,
		);
		expect(childIds(doc, "group-1")).toEqual(["rect-1", "rect-2"]);
	});

	it("puts a member back right after its group, keeping the given order", () => {
		const doc = groupedPair();
		docOps.addObjectsToGroup(doc, "group-1", ["rect-3"]);

		expect(docOps.removeObjectsFromGroup(doc, ["rect-1", "rect-3"])).toEqual({
			releasedIds: ["rect-1", "rect-3"],
			droppedGroupIds: [],
		});
		expect(rootIds(doc)).toEqual(["group-1", "rect-1", "rect-3", "rect-4"]);
		expect(childIds(doc, "group-1")).toEqual(["rect-2"]);
		expectValid(doc);
	});

	it("taking every member out is the same as ungrouping", () => {
		const doc = groupedPair();

		expect(
			docOps.removeObjectsFromGroup(doc, ["rect-1", "rect-2"]).droppedGroupIds,
		).toEqual(["group-1"]);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-3", "rect-4"]);
		expectValid(doc);
	});

	it("refuses an object that is not in a group", () => {
		const doc = groupedPair();

		expect(() => docOps.removeObjectsFromGroup(doc, ["rect-3"])).toThrow(
			/not inside a group/,
		);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3", "rect-4"]);
	});
});

describe("a rotated group", () => {
	/** Two rects in a group turned by `rotation`, with a third rect left outside. */
	const rotatedGroup = (rotation: number): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		readObject(doc, "group-1").rotation = rotation;
		return doc;
	};

	const groupChildIds = (doc: CanvasDoc): string[] =>
		(readObject(doc, "group-1").children as ObjectDoc[]).map(
			(child) => child.id,
		);

	it("cannot be dissolved, because its rotation has nowhere to go", () => {
		const doc = rotatedGroup(30);

		expect(() => docOps.ungroupObject(doc, "group-1")).toThrow(/rotated by 30/);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3"]);
	});

	it("takes no new member, and lets none of its own go", () => {
		const doc = rotatedGroup(30);

		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["rect-3"])).toThrow(
			/rotated/,
		);
		expect(() => docOps.removeObjectsFromGroup(doc, ["rect-1"])).toThrow(
			/rotated/,
		);
		expect(groupChildIds(doc)).toEqual(["rect-1", "rect-2"]);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3"]);
	});

	it("is only refused once actually turned, not for a written-out 0", () => {
		const doc = rotatedGroup(0);

		expect(docOps.addObjectsToGroup(doc, "group-1", ["rect-3"])).toEqual([]);
		expect(groupChildIds(doc)).toEqual(["rect-1", "rect-2", "rect-3"]);
		expectValid(doc);
	});
});

describe("an id given more than once", () => {
	const groupedPair = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400, 600]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		return doc;
	};

	const childIds = (doc: CanvasDoc, groupId: string): string[] =>
		(readObject(doc, groupId).children as ObjectDoc[]).map((child) => child.id);

	it("is not two objects, so it cannot make a group on its own", () => {
		const doc = groupedPair();

		expect(() => docOps.groupObjects(doc, ["rect-3", "rect-3"])).toThrow(
			/at least 2 objects, got 1/,
		);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3", "rect-4"]);
	});

	it("moves into a group once, leaving the object beside it alone", () => {
		const doc = groupedPair();

		docOps.addObjectsToGroup(doc, "group-1", ["rect-3", "rect-3"]);

		expect(childIds(doc, "group-1")).toEqual(["rect-1", "rect-2", "rect-3"]);
		expect(rootIds(doc)).toEqual(["group-1", "rect-4"]);
		expectValid(doc);
	});

	it("leaves a group once, and is reported once", () => {
		const doc = groupedPair();

		expect(docOps.removeObjectsFromGroup(doc, ["rect-1", "rect-1"])).toEqual({
			releasedIds: ["rect-1"],
			droppedGroupIds: [],
		});
		expect(rootIds(doc)).toEqual(["group-1", "rect-1", "rect-3", "rect-4"]);
		expect(childIds(doc, "group-1")).toEqual(["rect-2"]);
		expectValid(doc);
	});

	it("is deleted once when both a group and its child are named", () => {
		const doc = groupedPair();

		expect(docOps.deleteObjects(doc, ["group-1", "rect-1"])).toEqual({
			deletedIds: ["group-1", "rect-1", "rect-2"],
			cascadedIds: [],
		});
		expect(rootIds(doc)).toEqual(["rect-3", "rect-4"]);
		expectValid(doc);
	});
});

describe("groups emptied by a cascade", () => {
	/** A group holding another group, so emptying the inner one empties the outer. */
	const nestedGroups = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		docOps.groupObjects(doc, ["group-1", "rect-3"]);
		return doc;
	};

	it("go in the same pass, innermost first", () => {
		const doc = nestedGroups();

		const { cascadedIds } = docOps.deleteObjects(doc, [
			"rect-1",
			"rect-2",
			"rect-3",
		]);

		expect(cascadedIds).toEqual(["group-1", "group-2"]);
		expect(doc.root).toEqual([]);
	});

	it("survive as long as one child is left", () => {
		const doc = nestedGroups();

		expect(docOps.deleteObjects(doc, ["rect-1"]).cascadedIds).toEqual([]);
		expect(rootIds(doc)).toEqual(["group-2"]);
		expectValid(doc);
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

describe("objects measured from their children", () => {
	it("bring the whole group along when aligned by the box it occupies", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 40, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 200, y: 40, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 400, y: 0, width: 100, height: 100 });
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		docOps.alignObjects(doc, ["group-1", "rect-3"], "top");

		expect(readObject(doc, "rect-1")).toMatchObject({ x: 0, y: 0 });
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 200, y: 0 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 400, y: 0 });
		expectValid(doc);
	});

	it("have no box at all while empty, so they cannot be placed", () => {
		const doc = emptyDoc();
		doc.root.push({
			id: "group-1",
			type: "group",
			children: [],
		} as unknown as ObjectDoc);

		expect(() => docOps.moveObject(doc, "group-1", { x: 10 })).toThrow(
			/has no position that can be changed/,
		);
	});

	it("are refused outright when this instance does not know the type", () => {
		const doc = emptyDoc();
		doc.root.push({
			id: "gadget-1",
			type: "gadget",
			x: 0,
			y: 0,
		} as unknown as ObjectDoc);

		expect(() => docOps.moveObject(doc, "gadget-1", { x: 10 })).toThrow(
			/"gadget"\) has no position that can be changed/,
		);
	});
});
