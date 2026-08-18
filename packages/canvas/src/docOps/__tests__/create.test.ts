import { describe, expect, it } from "vitest";

import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	rootIds,
	twoRects,
} from "./support/docFixtures";
import { badgeDefinition } from "./support/pluginFixtures";

describe("addObject", () => {
	it("assigns friendly sequential ids and keeps top-left coordinates", () => {
		const doc = emptyDoc();
		const first = docOps.addObject(doc, "rect", { x: 40, y: 40 });
		const second = docOps.addObject(doc, "rect", {
			x: 0,
			y: 0,
			width: 200,
			height: 100,
		});

		expect(first).toBe("rect-1");
		expect(second).toBe("rect-2");

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.x).toBe(40);
		expect(rect.y).toBe(40);
	});

	it("uses the factory's default dimensions when width/height are omitted", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		// RECT_DOC_DEFAULTS (100x100) — the factory default, not the old docOps constant.
		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.width).toBe(100);
		expect(rect.height).toBe(100);
	});

	it("carries ObjectFactory style defaults (not a bare object)", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect).toMatchObject({ fill: expect.any(String), fontSize: 16 });
		expectValid(doc);
	});

	it("propagates text only when provided", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "hello" });

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.text).toBe("hello");
	});

	it("places a center-based ellipse from a top-left bounding box", () => {
		const doc = emptyDoc();
		// Top-left (320, 40) with a 160x100 box gives center (400, 90), rx 80, ry 50.
		const id = docOps.addObject(doc, "ellipse", {
			x: 320,
			y: 40,
			width: 160,
			height: 100,
		});

		expect(id).toBe("ellipse-1");
		const ellipse = doc.root[0] as Record<string, unknown>;
		expect(ellipse.cx).toBe(400);
		expect(ellipse.cy).toBe(90);
		expect(ellipse.rx).toBe(80);
		expect(ellipse.ry).toBe(50);
		expectValid(doc);
	});

	// A point-geometry doc stores the top-left and no box, so the position reaches
	// the doc untouched — no measurement, and nothing to offset a center by.
	it("keeps the given top-left for a point-geometry type", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", {
			x: 100,
			y: 100,
			text: "Hello World",
		});

		expect(id).toBe("text-1");
		const text = doc.root[0] as Record<string, unknown>;
		expect(text.type).toBe("text");
		expect(text.x).toBe(100);
		expect(text.y).toBe(100);
		expectValid(doc);
	});

	it("keeps a fractional top-left exact for a point-geometry type", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "text", { x: 12.5, y: -7.25, text: "Hello World" });

		const text = doc.root[0] as Record<string, unknown>;
		expect(text.x).toBe(12.5);
		expect(text.y).toBe(-7.25);
	});

	it("keeps box fields out of a point-geometry doc", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "text", { x: 0, y: 0, text: "sized by content" });

		const text = doc.root[0] as Record<string, unknown>;
		expect(text).not.toHaveProperty("width");
		expect(text).not.toHaveProperty("height");
	});

	it("throws DocOperationError when a point-geometry type is given a size", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.addObject(doc, "text", { x: 0, y: 0, width: 200 }),
		).toThrow(DocOperationError);
		expect(() =>
			docOps.addObject(doc, "text", { x: 0, y: 0, height: 40 }),
		).toThrow(DocOperationError);
		expect(doc.root).toHaveLength(0);
	});

	it("throws DocOperationError for an unknown type", () => {
		const doc = emptyDoc();
		expect(() => docOps.addObject(doc, "nope", { x: 0, y: 0 })).toThrow(
			DocOperationError,
		);
	});

	it("throws DocOperationError for a defined type without a factory", () => {
		const doc = emptyDoc();
		// group / connector / svg are defined but not programmatically creatable.
		expect(() => docOps.addObject(doc, "group", { x: 0, y: 0 })).toThrow(
			DocOperationError,
		);
	});
});

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

describe("addObject with points", () => {
	it("takes the vertices verbatim and keeps the factory's style defaults", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "polygon", {
			x: 0,
			y: 0,
			points: [
				{ x: 10, y: 20 },
				{ x: 110, y: 20 },
				{ x: 60, y: 80 },
			],
		});

		const polygon = readObject(doc, "polygon-1");
		expect(polygon.points).toEqual([
			{ x: 10, y: 20 },
			{ x: 110, y: 20 },
			{ x: 60, y: 80 },
		]);
		expect(polygon).toMatchObject({ fill: "transparent", strokeWidth: 2 });
		expectValid(doc);
	});

	it("ignores x/y/width/height, the vertices deciding where the shape sits", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "polyline", {
			x: 900,
			y: 900,
			width: 10,
			height: 10,
			points: [
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
		});

		expect(readObject(doc, "polyline-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		expect(docOps.getCombinedBounds(doc, ["polyline-1"])).toEqual({
			x: 0,
			y: 0,
			width: 100,
			height: 0,
		});
		expectValid(doc);
	});

	it("takes a rotation alongside, applied after the factory's own defaults", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, rotation: -45 });

		expect(readObject(doc, "rect-1").rotation).toBe(315);
		expectValid(doc);
	});

	it("refuses vertices on a type that is not built from them", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.addObject(doc, "rect", {
				x: 0,
				y: 0,
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 10 },
				],
			}),
		).toThrow(/is not built from vertices/);
		expect(doc.root).toEqual([]);
	});

	it("refuses fewer vertices than the type can make a shape from", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.addObject(doc, "polyline", {
				x: 0,
				y: 0,
				points: [{ x: 0, y: 0 }],
			}),
		).toThrow(/at least 2 points/);
		// A polygon is closed, so its own validator asks for one more than a polyline.
		expect(() =>
			docOps.addObject(doc, "polygon", {
				x: 0,
				y: 0,
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 10 },
				],
			}),
		).toThrow(/at least 3 points/);
		expect(doc.root).toEqual([]);
	});

	it("refuses a coordinate that is not finite", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.addObject(doc, "polyline", {
				x: 0,
				y: 0,
				points: [
					{ x: 0, y: 0 },
					{ x: Number.NaN, y: 10 },
				],
			}),
		).toThrow(/points\[1\] is not a finite coordinate pair/);
		expect(doc.root).toEqual([]);
	});
});

describe("addObject with a type's own props", () => {
	const badgedDocOps = createDocOps({
		plugins: [{ id: "badged-plugin", objects: { badged: badgeDefinition } }],
	});

	it("writes a property no parameter covers onto the new object", () => {
		const doc = emptyDoc();
		const id = badgedDocOps.addObject(doc, "badged", {
			x: 10,
			y: 20,
			props: { badge: "beta" },
		});

		expect(readObject(doc, id).badge).toBe("beta");
	});

	it("drops a prop given as undefined, the way an unfilled argument reads", () => {
		const doc = emptyDoc();
		const id = badgedDocOps.addObject(doc, "badged", {
			x: 0,
			y: 0,
			props: { badge: undefined },
		});

		expect(readObject(doc, id)).not.toHaveProperty("badge");
	});

	it("refuses a value the type rejects, leaving the doc untouched", () => {
		const doc = emptyDoc();
		expect(() =>
			badgedDocOps.addObject(doc, "badged", {
				x: 0,
				y: 0,
				props: { badge: "shiny" },
			}),
		).toThrow(DocOperationError);
		expect(doc.root).toHaveLength(0);
	});

	it("names the offending property in the error", () => {
		const doc = emptyDoc();
		expect(() =>
			badgedDocOps.addObject(doc, "badged", {
				x: 0,
				y: 0,
				props: { badge: 42 },
			}),
		).toThrow(/badged\.badge/);
	});

	it("refuses a name the type does not declare, naming the ones it has", () => {
		const doc = emptyDoc();
		expect(() =>
			badgedDocOps.addObject(doc, "badged", {
				x: 0,
				y: 0,
				props: { badgeKind: "new" },
			}),
		).toThrow(/must not carry "badgeKind".*own properties are "badge"/);
		expect(doc.root).toHaveLength(0);
	});

	it("refuses any prop on a type that declares none", () => {
		const doc = emptyDoc();
		expect(() =>
			docOps.addObject(doc, "rect", { x: 0, y: 0, props: { badge: "new" } }),
		).toThrow(/no properties of its own/);
	});

	it("refuses a name the call already takes as a parameter", () => {
		const doc = emptyDoc();
		expect(() =>
			badgedDocOps.addObject(doc, "badged", {
				x: 0,
				y: 0,
				props: { width: 400 },
			}),
		).toThrow(/must not carry "width"/);
		expect(() =>
			badgedDocOps.addObject(doc, "badged", {
				x: 0,
				y: 0,
				props: { id: "mine" },
			}),
		).toThrow(/must not carry "id"/);
	});

	it("reports which entry of a batch was refused", () => {
		const doc = emptyDoc();
		expect(() =>
			badgedDocOps.addObjects(doc, [
				{ type: "badged", x: 0, y: 0, props: { badge: "new" } },
				{ type: "badged", x: 120, y: 0, props: { badge: "shiny" } },
			]),
		).toThrow(/1/);
		expect(doc.root).toHaveLength(0);
	});
});

describe("addObjects", () => {
	it("adds every entry in the order given and returns their ids positionally", () => {
		const doc = emptyDoc();

		const ids = docOps.addObjects(doc, [
			{ type: "rect", x: 0, y: 0, width: 100, height: 100 },
			{ type: "ellipse", x: 320, y: 40, width: 160, height: 100 },
			{ type: "text", x: 10, y: 200, text: "note" },
		]);

		expect(ids).toEqual(["rect-1", "ellipse-1", "text-1"]);
		expect(rootIds(doc)).toEqual(ids);
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 0, y: 0 });
		expect(readObject(doc, "ellipse-1")).toMatchObject({ cx: 400, cy: 90 });
		expect(readObject(doc, "text-1")).toMatchObject({ x: 10, y: 200 });
		expectValid(doc);
	});

	// Nothing is pushed until the whole batch is built, so the id scan cannot see the
	// objects already staged; the reserved set is what keeps them apart.
	it("hands out ids that do not collide within one batch", () => {
		const doc = emptyDoc();

		expect(
			docOps.addObjects(doc, [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
				{ type: "rect", x: 400, y: 0 },
				{ type: "ellipse", x: 0, y: 200 },
				{ type: "ellipse", x: 200, y: 200 },
			]),
		).toEqual(["rect-1", "rect-2", "rect-3", "ellipse-1", "ellipse-2"]);
		expect(new Set(rootIds(doc)).size).toBe(5);
		expectValid(doc);
	});

	it("carries on numbering from the ids the doc already holds", () => {
		const doc = twoRects();
		// Nested, so the scan has to recurse into a group to see it.
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(
			docOps.addObjects(doc, [
				{ type: "rect", x: 0, y: 300 },
				{ type: "rect", x: 200, y: 300 },
			]),
		).toEqual(["rect-3", "rect-4"]);
		expectValid(doc);
	});

	it("leaves the doc untouched when one entry is bad", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.addObjects(doc, [
				{ type: "rect", x: 0, y: 300 },
				// A point-geometry type stores no box, so a size is refused.
				{ type: "text", x: 0, y: 400, width: 200 },
				{ type: "rect", x: 200, y: 300 },
			]),
		).toThrow(
			'entries[1] (text): object type "text" sizes itself from its content and takes no width/height — the document was left unchanged',
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op returning no ids for an empty array", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(docOps.addObjects(doc, [])).toEqual([]);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches addObject for a single entry", () => {
		const singleDoc = emptyDoc();
		docOps.addObject(singleDoc, "rect", {
			x: 40,
			y: 40,
			width: 120,
			height: 60,
			text: "step",
			fill: "#ffeeba",
		});

		const batchDoc = emptyDoc();
		docOps.addObjects(batchDoc, [
			{
				type: "rect",
				x: 40,
				y: 40,
				width: 120,
				height: 60,
				text: "step",
				fill: "#ffeeba",
			},
		]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});
