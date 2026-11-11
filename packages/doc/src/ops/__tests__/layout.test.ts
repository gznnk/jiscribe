import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	rootIds,
} from "./support/docFixtures";
import {
	captionedDefinition,
	columnCardDefinition,
	cutTopDefinition,
	ovalRegionDefinition,
	regionDefinition,
	slantedDefinition,
	tippedDefinition,
} from "./support/pluginFixtures";
import { calcLabelTextRegion } from "../../text/label/calcLabelTextRegion";

describe("layoutObjects", () => {
	/** Three boxes scattered out of order, joined a → b → c with ends on arbitrary points. */
	const scatteredChain = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 500, y: 300, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 40, y: 20, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 300, y: 500, width: 160, height: 80 });
		docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			sourceAnchor: "leftCenter",
			targetAnchor: "rightCenter",
			points: [{ x: 1, y: 1 }],
		});
		docOps.connect(doc, { sourceId: "rect-2", targetId: "rect-3" });
		return doc;
	};

	it("stacks a chain in flow order, keeping the drawing's top-left corner", () => {
		const doc = scatteredChain();

		const result = docOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		expect(result).toEqual({
			nodeIds: ["rect-1", "rect-2", "rect-3"],
			containerIds: [],
			connectorIds: ["connector-1", "connector-2"],
			restackedConnectorIds: [],
		});
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 40, y: 20 });
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 40, y: 160 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 40, y: 300 });
		expectValid(doc);
	});

	it("re-anchors connectors to the facing sides and rewrites their routes", () => {
		const doc = scatteredChain();

		docOps.layoutObjects(doc, undefined);

		expect(readObject(doc, "connector-1")).toMatchObject({
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "edge", side: "bottom", t: 0.5 },
			},
			target: {
				owner: { id: "rect-2" },
				anchor: { kind: "edge", side: "top", t: 0.5 },
			},
			points: [],
		});
		expect(readObject(doc, "connector-1").routing).toBeUndefined();
	});

	it("lays out left to right when asked", () => {
		const doc = scatteredChain();

		docOps.layoutObjects(doc, ["rect-1", "rect-2", "rect-3"], {
			direction: "LR",
			rankSpacing: 100,
		});

		expect(readObject(doc, "rect-2")).toMatchObject({ x: 300, y: 20 });
		expect(readObject(doc, "connector-1")).toMatchObject({
			source: { anchor: { kind: "edge", side: "right" } },
			target: { anchor: { kind: "edge", side: "left" } },
		});
	});

	it("leaves objects outside the given ids, and connectors to them, alone", () => {
		const doc = scatteredChain();
		docOps.addObject(doc, "rect", { x: 900, y: 900, width: 50, height: 50 });
		docOps.connect(doc, { sourceId: "rect-3", targetId: "rect-4" });

		const result = docOps.layoutObjects(doc, ["rect-1", "rect-2"]);

		expect(result.connectorIds).toEqual(["connector-1"]);
		expect(readObject(doc, "rect-4")).toMatchObject({ x: 900, y: 900 });
		expect(readObject(doc, "connector-3")).toMatchObject({
			source: { anchor: { kind: "center" } },
		});
	});

	it("keeps room for a label and moves it onto the line there", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 0, y: 300, width: 160, height: 80 });
		docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			label: "yes",
			labelPosition: 0.9,
			labelOffset: 20,
		});

		docOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		// The gap holds the label's box as well as the rank spacing.
		expect(readObject(doc, "rect-2").y as number).toBeGreaterThan(140);
		expect(readObject(doc, "connector-1")).toMatchObject({
			label: { text: "yes", position: 0.5, offset: 0 },
		});
	});

	it("keeps a group's children together inside it", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 900, y: 900, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 500, y: 100, width: 160, height: 80 });
		docOps.groupObjects(doc, ["rect-2", "rect-3"]);
		docOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
		docOps.connect(doc, { sourceId: "rect-2", targetId: "rect-3" });

		const result = docOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		expect(result.containerIds).toEqual(["group-1"]);
		expect(result.nodeIds).toEqual(["rect-1", "rect-2", "rect-3"]);
		const second = readObject(doc, "rect-2") as { x: number; y: number };
		const third = readObject(doc, "rect-3") as { x: number; y: number };
		// The two children stack under rect-1, inside their group; both moved from where
		// they were and the group's box tracks them (a group stores no container of its own).
		expect(third.y).toBeGreaterThan(second.y);
		expect(second).not.toMatchObject({ x: 900, y: 900 });
		expectValid(doc);
	});

	it("keeps the boxes' top-left with a group in the layout, and a second run changes nothing", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 60 });
		docOps.addObject(doc, "rect", { x: 300, y: 0, width: 100, height: 60 });
		docOps.addObject(doc, "rect", { x: 0, y: 300, width: 100, height: 60 });
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		docOps.connect(doc, { sourceId: "rect-1", targetId: "rect-3" });
		const readTopLeft = (): { x: number; y: number } => {
			const boxes = ["rect-1", "rect-2", "rect-3"].map(
				(id) => readObject(doc, id) as { x: number; y: number },
			);
			return {
				x: Math.min(...boxes.map(({ x }) => x)),
				y: Math.min(...boxes.map(({ y }) => y)),
			};
		};

		docOps.layoutObjects(doc, undefined);
		const once = structuredClone(doc.root);
		expect(readTopLeft()).toEqual({ x: 0, y: 0 });

		docOps.layoutObjects(doc, undefined);
		expect(doc.root).toEqual(once);
	});

	it("puts a text, whose box is measured, on a whole pixel", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "text", { x: 101, y: 0, text: "a longer text here" });
		docOps.addObject(doc, "rect", { x: 0, y: 300, width: 100, height: 60 });
		docOps.connect(doc, { sourceId: "text-1", targetId: "rect-1" });

		docOps.layoutObjects(doc, undefined);

		const { x, y } = readObject(doc, "text-1") as { x: number; y: number };
		expect(Number.isInteger(x)).toBe(true);
		expect(Number.isInteger(y)).toBe(true);
	});

	it("needs two placeable objects and names a missing id", () => {
		const doc = scatteredChain();

		expect(() => docOps.layoutObjects(doc, ["rect-1"])).toThrow(
			new DocOperationError("layout needs at least 2 objects to place, got 1"),
		);
		expect(() => docOps.layoutObjects(doc, ["rect-1", "ghost"])).toThrow(
			DocOperationError,
		);
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 500, y: 300 });
	});
});

describe("layoutObjects with container shapes and declared connect points", () => {
	const regionDocOps = createDocOps({
		plugins: [
			{
				id: "region-plugin",
				objects: {
					region: regionDefinition,
					"oval-region": ovalRegionDefinition,
					"column-card": columnCardDefinition,
				},
			},
		],
	});
	const box = (doc: CanvasDoc, id: string): Rect => {
		const object = readObject(doc, id) as Rect;
		return {
			x: object.x,
			y: object.y,
			width: object.width,
			height: object.height,
		};
	};
	const isInside = (outer: Rect, inner: Rect): boolean =>
		inner.x > outer.x &&
		inner.y > outer.y &&
		inner.x + inner.width < outer.x + outer.width &&
		inner.y + inner.height < outer.y + outer.height;

	/** A region holding two boxes, one box outside it, and a chain through all three. */
	const regionDoc = (): CanvasDoc => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 400,
			height: 300,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 20,
			y: 40,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 250,
			y: 200,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 600,
			y: 600,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-3", targetId: "rect-1" });
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
		return doc;
	};

	it("keeps a container shape's members inside it, below its title band, and resizes it", () => {
		const doc = regionDoc();

		const result = regionDocOps.layoutObjects(doc, undefined, {
			rankSpacing: 60,
		});

		expect(result.containerIds).toEqual(["region-1"]);
		expect(result.nodeIds).toEqual(["rect-1", "rect-2", "rect-3"]);
		const region = box(doc, "region-1");
		expect(isInside(region, box(doc, "rect-1"))).toBe(true);
		expect(isInside(region, box(doc, "rect-2"))).toBe(true);
		expect(isInside(region, box(doc, "rect-3"))).toBe(false);
		expect(box(doc, "rect-1").y - region.y).toBeGreaterThanOrEqual(20);
		expect(region).not.toMatchObject({ width: 400, height: 300 });
		expectValid(doc);
	});

	it("nests two container shapes with the same box, the earlier one around the later", () => {
		const doc = emptyDoc();
		for (let index = 0; index < 2; index++) {
			regionDocOps.addObject(doc, "region", {
				x: 0,
				y: 0,
				width: 400,
				height: 300,
			});
		}
		regionDocOps.addObject(doc, "rect", {
			x: 20,
			y: 40,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 600,
			y: 600,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });

		const result = regionDocOps.layoutObjects(doc, undefined);

		expect(result.containerIds).toEqual(["region-1", "region-2"]);
		const outer = box(doc, "region-1");
		const inner = box(doc, "region-2");
		expect(isInside(outer, inner)).toBe(true);
		expect(isInside(inner, box(doc, "rect-1"))).toBe(true);
		expect(isInside(outer, box(doc, "rect-2"))).toBe(false);
		expectValid(doc);
	});

	it("keeps the title band the container's own doc sizes clear", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 400,
			height: 300,
			extraProps: { headerHeight: 90 },
		});
		regionDocOps.addObject(doc, "rect", {
			x: 20,
			y: 40,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 20,
			y: 200,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });

		regionDocOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		const region = box(doc, "region-1");
		expect(box(doc, "rect-1").y - region.y).toBeGreaterThanOrEqual(90);
		expect(isInside(region, box(doc, "rect-2"))).toBe(true);
		expectValid(doc);
	});

	it.each([-5, Number.NaN])(
		"treats a title band of %s as none, keeping every box finite",
		(headerHeight) => {
			const doc = emptyDoc();
			regionDocOps.addObject(doc, "region", {
				x: 0,
				y: 0,
				width: 400,
				height: 300,
			});
			(readObject(doc, "region-1") as { headerHeight?: number }).headerHeight =
				headerHeight;
			regionDocOps.addObject(doc, "rect", {
				x: 20,
				y: 40,
				width: 100,
				height: 50,
			});
			regionDocOps.addObject(doc, "rect", {
				x: 20,
				y: 200,
				width: 100,
				height: 50,
			});
			regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });

			regionDocOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

			for (const id of ["region-1", "rect-1", "rect-2"]) {
				for (const value of Object.values(box(doc, id))) {
					expect(Number.isFinite(value)).toBe(true);
				}
			}
			// Less room than the fixture's 20px band leaves, by that band's height.
			const banded = regionDoc();
			regionDocOps.layoutObjects(banded, undefined, { rankSpacing: 60 });
			expect(box(doc, "rect-1").y - box(doc, "region-1").y).toBe(
				box(banded, "rect-1").y - box(banded, "region-1").y - 20,
			);
		},
	);

	it("nests container shapes, the smallest around a box being its parent", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 800,
			height: 600,
		});
		regionDocOps.addObject(doc, "region", {
			x: 50,
			y: 50,
			width: 300,
			height: 200,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 80,
			y: 90,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 500,
			y: 400,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });

		regionDocOps.layoutObjects(doc, undefined);

		expect(isInside(box(doc, "region-1"), box(doc, "region-2"))).toBe(true);
		expect(isInside(box(doc, "region-2"), box(doc, "rect-1"))).toBe(true);
		expect(isInside(box(doc, "region-2"), box(doc, "rect-2"))).toBe(false);
		expect(isInside(box(doc, "region-1"), box(doc, "rect-2"))).toBe(true);
	});

	it("places an empty container shape as a box of its own", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "region", {
			x: 900,
			y: 900,
			width: 400,
			height: 300,
		});
		regionDocOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 50 });
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "region-1" });

		const result = regionDocOps.layoutObjects(doc, undefined, {
			rankSpacing: 60,
		});

		expect(result.nodeIds).toEqual(["rect-1", "region-1"]);
		expect(result.containerIds).toEqual([]);
		expect(box(doc, "region-1")).toMatchObject({ width: 400, height: 300 });
		expect(box(doc, "region-1").y).toBe(50 + 60);
	});

	it("redraws a connector on a container shape between the facing sides, clear of other ends", () => {
		const doc = regionDoc();
		regionDocOps.connect(doc, { sourceId: "region-1", targetId: "rect-3" });

		const result = regionDocOps.layoutObjects(doc, undefined, {
			rankSpacing: 60,
		});

		// The edges in the order the layout read them (by their ends), then the redrawn one.
		expect(result.connectorIds).toEqual([
			"connector-2",
			"connector-1",
			"connector-3",
		]);
		const redrawn = readObject(doc, "connector-3") as {
			source: { anchor: { kind: string; side: string; t: number } };
			target: { anchor: { kind: string; side: string; t: number } };
			points: unknown[];
		};
		// rect-3 sits above the region (it feeds rect-1), so the line runs out of the
		// region's top into rect-3's bottom; rect-3's bottom already holds the chain's
		// end at its midpoint, so this one lands beside it.
		expect(redrawn.source.anchor).toMatchObject({ kind: "edge", side: "top" });
		expect(redrawn.target.anchor).toMatchObject({
			kind: "edge",
			side: "bottom",
		});
		expect(redrawn.target.anchor.t).not.toBe(0.5);
		expect(redrawn.points).toEqual([]);
	});

	it("keeps a declared connect point on a connector into a container shape", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 400,
			height: 300,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 50,
			y: 60,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 200,
			y: 200,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "column-card", { x: 700, y: 0 });
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
		regionDocOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "region-1",
			sourceAnchor: "col:2:left",
		});

		regionDocOps.layoutObjects(doc, undefined, { direction: "LR" });

		expect(readObject(doc, "connector-2")).toMatchObject({
			source: { anchor: { kind: "connectPoint", id: "col:2:left" } },
			target: { anchor: { kind: "edge" } },
			points: [],
		});
	});

	it("moves a container whose geometry is not a rect's without resizing it", () => {
		const doc = emptyDoc();
		doc.root.push({
			id: "oval-1",
			type: "oval-region",
			cx: 300,
			cy: 300,
			rx: 300,
			ry: 200,
		} as ObjectDoc);
		regionDocOps.addObject(doc, "rect", {
			x: 100,
			y: 250,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 400,
			y: 250,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });

		const result = regionDocOps.layoutObjects(doc, undefined);

		expect(result.containerIds).toEqual(["oval-1"]);
		const oval = readObject(doc, "oval-1") as {
			cx: number;
			cy: number;
			rx: number;
			ry: number;
		};
		// Still the size it was, and still around both members, which now stack.
		expect(oval).toMatchObject({ rx: 300, ry: 200 });
		const ovalBox = {
			x: oval.cx - oval.rx,
			y: oval.cy - oval.ry,
			width: oval.rx * 2,
			height: oval.ry * 2,
		};
		expect(isInside(ovalBox, box(doc, "rect-1"))).toBe(true);
		expect(isInside(ovalBox, box(doc, "rect-2"))).toBe(true);
		expect(box(doc, "rect-2").y).toBeGreaterThan(box(doc, "rect-1").y);
	});

	it("takes a group lying inside a container shape in as a member", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 600,
			height: 500,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 50,
			y: 60,
			width: 100,
			height: 50,
		});
		regionDocOps.addObject(doc, "rect", {
			x: 300,
			y: 300,
			width: 100,
			height: 50,
		});
		regionDocOps.groupObjects(doc, ["rect-1", "rect-2"]);
		regionDocOps.addObject(doc, "rect", {
			x: 900,
			y: 900,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-3" });

		const result = regionDocOps.layoutObjects(doc, undefined);

		expect(result.containerIds).toEqual(["region-1", "group-1"]);
		const region = box(doc, "region-1");
		expect(isInside(region, box(doc, "rect-1"))).toBe(true);
		expect(isInside(region, box(doc, "rect-2"))).toBe(true);
		expect(isInside(region, box(doc, "rect-3"))).toBe(false);
	});

	it("keeps an end on a declared connect point and leaves that route to the engine", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "column-card", { x: 500, y: 0 });
		regionDocOps.addObject(doc, "rect", {
			x: 0,
			y: 400,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "rect-1",
			sourceAnchor: "col:1:right",
			points: [{ x: 5, y: 5 }],
		});

		regionDocOps.layoutObjects(doc, undefined, { direction: "LR" });

		expect(readObject(doc, "connector-1")).toMatchObject({
			source: { anchor: { kind: "connectPoint", id: "col:1:right" } },
			target: { anchor: { kind: "edge", side: "left" } },
			points: [],
		});
	});

	it("reroutes a self loop without touching its ends", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 50 });
		regionDocOps.addObject(doc, "rect", {
			x: 300,
			y: 300,
			width: 100,
			height: 50,
		});
		regionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
		regionDocOps.connect(doc, {
			sourceId: "rect-2",
			targetId: "rect-2",
			sourceAnchor: "rightCenter",
			targetAnchor: "bottomCenter",
			points: [{ x: 500, y: 500 }],
		});

		const result = regionDocOps.layoutObjects(doc, undefined);

		expect(result.connectorIds).toEqual(["connector-1", "connector-2"]);
		expect(readObject(doc, "connector-2")).toMatchObject({
			source: { anchor: { kind: "connectPoint", id: "rightCenter" } },
			target: { anchor: { kind: "connectPoint", id: "bottomCenter" } },
			points: [],
		});
	});

	it("counts an object named together with its group once", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 50 });
		regionDocOps.addObject(doc, "rect", {
			x: 300,
			y: 300,
			width: 100,
			height: 50,
		});
		regionDocOps.groupObjects(doc, ["rect-1", "rect-2"]);

		const result = regionDocOps.layoutObjects(doc, [
			"group-1",
			"rect-1",
			"rect-2",
		]);

		expect(result.nodeIds).toEqual(["rect-1", "rect-2"]);
		expect(result.containerIds).toEqual(["group-1"]);
	});

	it("skips an object the build cannot measure when ids are omitted, and names it when given", () => {
		const doc = emptyDoc();
		regionDocOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 50 });
		regionDocOps.addObject(doc, "rect", {
			x: 300,
			y: 300,
			width: 100,
			height: 50,
		});
		doc.root.push({
			id: "mystery-1",
			type: "mystery",
			x: 1,
			y: 2,
		} as ObjectDoc);

		const result = regionDocOps.layoutObjects(doc, undefined);

		expect(result.nodeIds).toEqual(["rect-1", "rect-2"]);
		expect(readObject(doc, "mystery-1")).toMatchObject({ x: 1, y: 2 });
		expect(() =>
			regionDocOps.layoutObjects(doc, ["rect-1", "rect-2", "mystery-1"]),
		).toThrow(DocOperationError);
	});

	it("refuses a bad spacing or direction before touching the document", () => {
		const doc = regionDoc();
		const before = JSON.stringify(doc);

		for (const params of [
			{ nodeSpacing: -1 },
			{ rankSpacing: Number.NaN },
			{ direction: "diagonal" as unknown as "TB" },
		]) {
			expect(() => regionDocOps.layoutObjects(doc, undefined, params)).toThrow(
				DocOperationError,
			);
		}
		expect(JSON.stringify(doc)).toBe(before);
	});
});

describe("layoutObjects on shapes whose outline is not their box", () => {
	const outlinedDocOps = createDocOps({
		plugins: [
			{
				id: "outlined-plugin",
				objects: {
					slanted: slantedDefinition,
					"cut-top": cutTopDefinition,
					tipped: tippedDefinition,
					region: regionDefinition,
				},
			},
		],
	});
	type EdgeEnd = {
		owner: { id: string };
		anchor: { kind: string; side: string; t: number };
	};
	const readEnds = (doc: CanvasDoc, id: string): EdgeEnd[] => {
		const connector = readObject(doc, id) as {
			source: EdgeEnd;
			target: EdgeEnd;
		};
		return [connector.source, connector.target];
	};
	/** Where a left / right edge anchor is drawn, in world y, given the owner's anchor region's local y and height. */
	const drawnY = (
		doc: CanvasDoc,
		end: EdgeEnd,
		region: { y: number; height: number },
	): number => {
		const owner = readObject(doc, end.owner.id) as Rect;
		return owner.y + owner.height / 2 + region.y + region.height * end.anchor.t;
	};

	it("keeps every end on a parallelogram's bottom where its outline reaches", () => {
		// A narrow box beside a wide one under the parallelogram: the narrow one's
		// column falls past where the slanted side crosses the bottom's center line.
		const doc = emptyDoc();
		outlinedDocOps.addObject(doc, "slanted", { x: 0, y: 0 });
		outlinedDocOps.addObject(doc, "rect", {
			x: 0,
			y: 200,
			width: 60,
			height: 40,
		});
		outlinedDocOps.addObject(doc, "rect", {
			x: 100,
			y: 200,
			width: 160,
			height: 80,
		});
		outlinedDocOps.connect(doc, { sourceId: "slanted-1", targetId: "rect-1" });
		outlinedDocOps.connect(doc, { sourceId: "slanted-1", targetId: "rect-2" });

		outlinedDocOps.layoutObjects(doc, undefined, { nodeSpacing: 20 });

		for (const connectorId of ["connector-1", "connector-2"]) {
			const [source] = readEnds(doc, connectorId);
			expect(source.anchor).toMatchObject({ kind: "edge", side: "bottom" });
			expect(source.anchor.t).toBeGreaterThanOrEqual(0.11 - 1e-6);
			expect(source.anchor.t).toBeLessThanOrEqual(0.89 + 1e-6);
		}
		expectValid(doc);
	});

	it("lays a rotated parallelogram out by its box, its outline aside", () => {
		const doc = emptyDoc();
		outlinedDocOps.addObject(doc, "slanted", { x: 0, y: 0 });
		outlinedDocOps.addObject(doc, "rect", {
			x: 0,
			y: 200,
			width: 60,
			height: 40,
		});
		outlinedDocOps.addObject(doc, "rect", {
			x: 100,
			y: 200,
			width: 160,
			height: 80,
		});
		outlinedDocOps.connect(doc, { sourceId: "slanted-1", targetId: "rect-1" });
		outlinedDocOps.connect(doc, { sourceId: "slanted-1", targetId: "rect-2" });
		outlinedDocOps.setRotation(doc, ["slanted-1"], 180);

		outlinedDocOps.layoutObjects(doc, undefined, { nodeSpacing: 20 });

		// Straight on the narrow box's column, past where the unturned outline reaches.
		const [source] = readEnds(doc, "connector-1");
		expect(source.anchor.t).toBeGreaterThan(0.89);
	});

	it("writes an end as a ratio of the anchor region, so a straight line meets a cut-top shape's side level", () => {
		const doc = emptyDoc();
		outlinedDocOps.addObject(doc, "rect", {
			x: 0,
			y: 0,
			width: 160,
			height: 100,
		});
		outlinedDocOps.addObject(doc, "cut-top", { x: 400, y: 300 });
		outlinedDocOps.connect(doc, { sourceId: "rect-1", targetId: "cut-top-1" });

		outlinedDocOps.layoutObjects(doc, undefined, { direction: "LR" });

		const [source, target] = readEnds(doc, "connector-1");
		// The middle of the body below the cut, which is the region's own middle.
		expect(target.anchor).toMatchObject({ kind: "edge", side: "left", t: 0.5 });
		expect(drawnY(doc, source, { y: -50, height: 100 })).toBeCloseTo(
			drawnY(doc, target, { y: -30, height: 80 }),
			6,
		);
		expect(readObject(doc, "connector-1").points).toEqual([]);
	});

	it("centres a side's only end on a rotated cut-top shape's body, as on an unturned one", () => {
		const doc = emptyDoc();
		outlinedDocOps.addObject(doc, "rect", {
			x: 0,
			y: 0,
			width: 160,
			height: 100,
		});
		outlinedDocOps.addObject(doc, "cut-top", { x: 400, y: 300 });
		outlinedDocOps.connect(doc, { sourceId: "rect-1", targetId: "cut-top-1" });
		outlinedDocOps.setRotation(doc, ["cut-top-1"], 180);

		outlinedDocOps.layoutObjects(doc, undefined, { direction: "LR" });

		const [, target] = readEnds(doc, "connector-1");
		expect(target.anchor).toMatchObject({ kind: "edge", side: "left", t: 0.5 });
	});

	it("writes an end as a ratio of the anchor region, so a straight line meets a tipped shape's side level", () => {
		const doc = emptyDoc();
		outlinedDocOps.addObject(doc, "tipped", { x: 0, y: 0 });
		outlinedDocOps.addObject(doc, "rect", {
			x: 400,
			y: 300,
			width: 160,
			height: 100,
		});
		outlinedDocOps.connect(doc, { sourceId: "tipped-1", targetId: "rect-1" });

		outlinedDocOps.layoutObjects(doc, undefined, { direction: "LR" });

		const [source, target] = readEnds(doc, "connector-1");
		// Level with the box's middle, which is two thirds down the body above the tip.
		expect(source.anchor).toMatchObject({ kind: "edge", side: "right" });
		expect(source.anchor.t).toBeCloseTo(2 / 3, 9);
		expect(drawnY(doc, source, { y: -50, height: 75 })).toBeCloseTo(
			drawnY(doc, target, { y: -50, height: 100 }),
			6,
		);
		expect(readObject(doc, "connector-1").points).toEqual([]);
	});

	it("finds a free spot for a line from a container shape on the box, clear of a stored end", () => {
		// rect-1 inside the region feeds the cut-top shape; the region's own line to it
		// is redrawn after, beside the end the chain left on its left side. That end is
		// stored as 0.5 of the region (0.6 of the box), and the spot one
		// EDGE_END_SPACING (0.2 of the 100 px side) above it is 0.4 of the box, stored
		// as 0.25 of the region.
		const doc = emptyDoc();
		outlinedDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 400,
			height: 300,
		});
		outlinedDocOps.addObject(doc, "rect", {
			x: 20,
			y: 40,
			width: 100,
			height: 50,
		});
		outlinedDocOps.addObject(doc, "cut-top", { x: 600, y: 0 });
		outlinedDocOps.connect(doc, { sourceId: "rect-1", targetId: "cut-top-1" });
		outlinedDocOps.connect(doc, {
			sourceId: "region-1",
			targetId: "cut-top-1",
		});

		outlinedDocOps.layoutObjects(doc, undefined, { direction: "LR" });

		const [, chainEnd] = readEnds(doc, "connector-1");
		const [, redrawnEnd] = readEnds(doc, "connector-2");
		expect(chainEnd.anchor).toMatchObject({ side: "left", t: 0.5 });
		expect(redrawnEnd.anchor.side).toBe("left");
		expect(redrawnEnd.anchor.t).toBeCloseTo(0.25, 9);
	});
});

describe("layoutObjects on shapes hanging a caption below their box", () => {
	const captionDocOps = createDocOps({
		plugins: [
			{
				id: "caption-plugin",
				objects: {
					captioned: captionedDefinition,
					region: regionDefinition,
					"column-card": columnCardDefinition,
				},
			},
		],
	});
	const boxOf = (doc: CanvasDoc, id: string): Rect => {
		const { x, y, width, height } = readObject(doc, id) as Rect;
		return { x, y, width, height };
	};
	/** The box and the caption hung below it, as one rectangle in the doc's frame. */
	const drawnOf = (doc: CanvasDoc, id: string): Rect => {
		const box = boxOf(doc, id);
		const caption = calcLabelTextRegion(
			box,
			{ text: (readObject(doc, id) as { text: string }).text },
			undefined,
		);
		const left = Math.min(box.x, box.x + box.width / 2 + caption.x);
		const right = Math.max(
			box.x + box.width,
			box.x + box.width / 2 + caption.x + caption.width,
		);
		const bottom = box.y + box.height / 2 + caption.y + caption.height;
		return { x: left, y: box.y, width: right - left, height: bottom - box.y };
	};
	const overlaps = (a: Rect, b: Rect): boolean =>
		a.x < b.x + b.width &&
		b.x < a.x + a.width &&
		a.y < b.y + b.height &&
		b.y < a.y + a.height;
	const isInside = (outer: Rect, inner: Rect): boolean =>
		inner.x > outer.x &&
		inner.y > outer.y &&
		inner.x + inner.width < outer.x + outer.width &&
		inner.y + inner.height < outer.y + outer.height;
	const addCaptioned = (doc: CanvasDoc, text: string, x = 0, y = 0): void => {
		captionDocOps.addObject(doc, "captioned", { x, y, text });
	};

	it("keeps every caption inside its container and clear of the other shapes", () => {
		const doc = emptyDoc();
		captionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 600,
			height: 400,
		});
		addCaptioned(doc, "Application Load Balancer", 40, 60);
		addCaptioned(doc, "Web server (primary)", 200, 60);
		addCaptioned(doc, "Web server (standby)", 400, 60);
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "captioned-3",
		});

		captionDocOps.layoutObjects(doc, undefined);

		const region = boxOf(doc, "region-1");
		const drawn = ["captioned-1", "captioned-2", "captioned-3"].map((id) =>
			drawnOf(doc, id),
		);
		for (const [index, rect] of drawn.entries()) {
			expect(isInside(region, rect)).toBe(true);
			for (const other of drawn.slice(index + 1)) {
				expect(overlaps(rect, other)).toBe(false);
			}
		}
		expectValid(doc);
	});

	it("moves a connector leaving through its source's caption to just beneath that shape, once", () => {
		const doc = emptyDoc();
		addCaptioned(doc, "Load balancer");
		addCaptioned(doc, "Server");
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});

		const result = captionDocOps.layoutObjects(doc, undefined);

		expect(result.restackedConnectorIds).toEqual(["connector-1"]);
		expect(rootIds(doc)).toEqual(["connector-1", "captioned-1", "captioned-2"]);
		// A second run finds everything where it put it.
		const laidOut = structuredClone(doc);
		const again = captionDocOps.layoutObjects(doc, undefined);
		expect(again.restackedConnectorIds).toEqual([]);
		expect(doc).toEqual(laidOut);
	});

	it("reads the edges in the shapes' order, so restacking leaves a second run nothing to change", () => {
		// Restacking puts every connector just beneath its source, which takes
		// connector-1, from the fifth shape, behind the other six; read in the
		// connectors' own order, a second run would read another and move the shapes.
		const doc = emptyDoc();
		for (let index = 1; index <= 6; index += 1) {
			addCaptioned(doc, `Node number ${index}`);
		}
		for (const [source, target] of [
			[5, 6],
			[1, 2],
			[2, 3],
			[2, 4],
			[1, 5],
			[1, 4],
			[1, 2],
		]) {
			captionDocOps.connect(doc, {
				sourceId: `captioned-${source}`,
				targetId: `captioned-${target}`,
			});
		}

		captionDocOps.layoutObjects(doc, undefined);
		const laidOut = structuredClone(doc);
		captionDocOps.layoutObjects(doc, undefined);

		expect(doc).toEqual(laidOut);
	});

	it("brings a connector beneath the group holding the shape, not into it", () => {
		const doc = emptyDoc();
		addCaptioned(doc, "Load balancer");
		addCaptioned(doc, "Server");
		const groupId = captionDocOps.groupObjects(doc, [
			"captioned-1",
			"captioned-2",
		]);
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});

		const result = captionDocOps.layoutObjects(doc, [groupId]);

		expect(result.restackedConnectorIds).toEqual(["connector-1"]);
		expect(rootIds(doc)).toEqual(["connector-1", groupId]);
		expect(
			(readObject(doc, groupId) as { children: ObjectDoc[] }).children.map(
				({ id }) => id,
			),
		).toEqual(["captioned-1", "captioned-2"]);
	});

	it("leaves the order alone where no end runs under a caption", () => {
		// Left to right, the ends sit on the sides a wide caption reaches past.
		const sideways = emptyDoc();
		addCaptioned(sideways, "Application Load Balancer");
		addCaptioned(sideways, "Application server");
		captionDocOps.connect(sideways, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});
		expect(
			captionDocOps.layoutObjects(sideways, undefined, { direction: "LR" })
				.restackedConnectorIds,
		).toEqual([]);
		expect(rootIds(sideways)).toEqual([
			"captioned-1",
			"captioned-2",
			"connector-1",
		]);

		// A turned shape is laid out by its box alone.
		const turned = emptyDoc();
		addCaptioned(turned, "Load balancer");
		addCaptioned(turned, "Server");
		captionDocOps.connect(turned, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});
		captionDocOps.setRotation(turned, ["captioned-1"], 90);
		expect(
			captionDocOps.layoutObjects(turned, undefined).restackedConnectorIds,
		).toEqual([]);

		// A connector already beneath its shape stays where it is.
		const below = emptyDoc();
		addCaptioned(below, "Load balancer");
		addCaptioned(below, "Server");
		captionDocOps.connect(below, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});
		captionDocOps.reorderObjects(below, ["connector-1"], "back");
		expect(
			captionDocOps.layoutObjects(below, undefined).restackedConnectorIds,
		).toEqual([]);
		expect(rootIds(below)).toEqual([
			"connector-1",
			"captioned-1",
			"captioned-2",
		]);
	});

	it("leaves a connector whose route the layout does not write where it stands", () => {
		const doc = emptyDoc();
		addCaptioned(doc, "Load balancer");
		captionDocOps.addObject(doc, "column-card", { x: 400, y: 400 });
		addCaptioned(doc, "Server");
		// A self loop, and a line kept on a declared connect point at its far end.
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "captioned-1",
			sourceAnchor: "bottomCenter",
			targetAnchor: "rightCenter",
		});
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "column-card-1",
			targetAnchor: "col:1:left",
		});
		captionDocOps.connect(doc, {
			sourceId: "captioned-1",
			targetId: "captioned-2",
		});

		const result = captionDocOps.layoutObjects(doc, undefined);

		expect(
			(readObject(doc, "connector-2") as { source: { anchor: unknown } }).source
				.anchor,
		).toMatchObject({ kind: "edge", side: "bottom" });
		expect(result.restackedConnectorIds).toEqual(["connector-3"]);
		expect(rootIds(doc)).toEqual([
			"connector-3",
			"captioned-1",
			"column-card-1",
			"captioned-2",
			"connector-1",
			"connector-2",
		]);
	});
});
