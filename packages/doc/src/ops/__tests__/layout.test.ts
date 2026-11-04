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
} from "./support/docFixtures";
import {
	columnCardDefinition,
	regionDefinition,
} from "./support/pluginFixtures";

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

		expect(result.connectorIds).toEqual([
			"connector-1",
			"connector-2",
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
