import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	twoConnectedRects,
} from "./support/docFixtures";

describe("setRotation", () => {
	it("turns the types that have a rotation and skips the ones that do not", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "polyline", { x: 0, y: 200 });

		const result = docOps.setRotation(doc, ["rect-1", "polyline-1"], 45);

		expect(result).toEqual({
			rotatedIds: ["rect-1"],
			ignoredIds: ["polyline-1"],
		});
		expect(readObject(doc, "rect-1").rotation).toBe(45);
		expect(readObject(doc, "polyline-1")).not.toHaveProperty("rotation");
		expectValid(doc);
	});

	it("normalizes the angle into 0-360, so -90 and 270 are the same turn", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		docOps.setRotation(doc, ["rect-1"], -90);

		expect(readObject(doc, "rect-1").rotation).toBe(270);
		expectValid(doc);
	});

	it("drops the property at 0, an absent rotation being the identity", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, rotation: 30 });

		docOps.setRotation(doc, ["rect-1"], 720);

		expect(readObject(doc, "rect-1")).not.toHaveProperty("rotation");
		expectValid(doc);
	});

	it("turns a group as a whole, its children left where they are", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		docOps.setRotation(doc, ["group-1"], 90);

		expect(readObject(doc, "group-1").rotation).toBe(90);
		expect(readObject(doc, "rect-1").x).toBe(0);
		expectValid(doc);
	});

	it("leaves every object untouched when any id is missing", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() => docOps.setRotation(doc, ["rect-1", "missing"], 45)).toThrow(
			DocOperationError,
		);
		expect(readObject(doc, "rect-1")).not.toHaveProperty("rotation");
	});

	it("refuses an angle that is not a finite number of degrees", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() => docOps.setRotation(doc, ["rect-1"], Number.NaN)).toThrow(
			/finite number of degrees/,
		);
		expect(() =>
			docOps.setRotation(doc, ["rect-1"], Number.POSITIVE_INFINITY),
		).toThrow(DocOperationError);
		expect(readObject(doc, "rect-1")).not.toHaveProperty("rotation");
	});
});

describe("setPoints", () => {
	it("replaces the whole outline, which moves and resizes the shape with it", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "polygon", { x: 0, y: 0 });

		docOps.setPoints(doc, "polygon-1", [
			{ x: 0, y: 0 },
			{ x: 40, y: 0 },
			{ x: 40, y: 30 },
			{ x: 0, y: 30 },
		]);

		expect(readObject(doc, "polygon-1").points).toHaveLength(4);
		expect(docOps.getCombinedBounds(doc, ["polygon-1"])).toEqual({
			x: 0,
			y: 0,
			width: 40,
			height: 30,
		});
		expectValid(doc);
	});

	it("copies the vertices, so the caller's array is not aliased into the doc", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "polyline", { x: 0, y: 0 });
		const points = [
			{ x: 0, y: 0 },
			{ x: 50, y: 50 },
		];

		docOps.setPoints(doc, "polyline-1", points);
		points[1].x = 999;

		expect(readObject(doc, "polyline-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 50 },
		]);
	});

	it("refuses a connector, whose points are the route's waypoints", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.setPoints(doc, "connector-1", [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			]),
		).toThrow(/updateConnector/);
	});

	it("refuses a type that is not built from vertices, and a shape left too small", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "polygon", { x: 0, y: 200 });

		expect(() =>
			docOps.setPoints(doc, "rect-1", [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			]),
		).toThrow(/is not built from vertices/);
		expect(() =>
			docOps.setPoints(doc, "polygon-1", [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			]),
		).toThrow(/at least 3 points/);
		expect(readObject(doc, "polygon-1").points).toHaveLength(5);
	});
});

describe("setPointsMany", () => {
	/** A polygon and a polyline, each still carrying the outline the factory chose. */
	const twoPolys = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "polygon", { x: 0, y: 0, width: 100, height: 100 });
		docOps.addObject(doc, "polyline", {
			x: 0,
			y: 200,
			width: 100,
			height: 100,
		});
		return doc;
	};

	it("reshapes every listed shape with its own outline", () => {
		const doc = twoPolys();

		docOps.setPointsMany(doc, [
			{
				id: "polygon-1",
				points: [
					{ x: 0, y: 0 },
					{ x: 40, y: 0 },
					{ x: 40, y: 30 },
				],
			},
			{
				id: "polyline-1",
				points: [
					{ x: 5, y: 5 },
					{ x: 6, y: 6 },
				],
			},
		]);

		expect(readObject(doc, "polygon-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 40, y: 0 },
			{ x: 40, y: 30 },
		]);
		expect(readObject(doc, "polyline-1").points).toEqual([
			{ x: 5, y: 5 },
			{ x: 6, y: 6 },
		]);
		expectValid(doc);
	});

	it("lets the last entry for a repeated id decide the outline", () => {
		const doc = twoPolys();

		docOps.setPointsMany(doc, [
			{
				id: "polyline-1",
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 0 },
				],
			},
			{
				id: "polyline-1",
				points: [
					{ x: 0, y: 0 },
					{ x: 20, y: 0 },
				],
			},
		]);

		expect(readObject(doc, "polyline-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
		]);
	});

	it("leaves the doc untouched when one entry names a type not built from vertices", () => {
		const doc = twoPolys();
		docOps.addObject(doc, "rect", { x: 0, y: 400, width: 100, height: 100 });
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.setPointsMany(doc, [
				{
					id: "polygon-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 40, y: 0 },
						{ x: 40, y: 30 },
					],
				},
				{
					id: "rect-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 1, y: 1 },
					],
				},
			]),
		).toThrow(
			'entries[1] (rect-1): rect-1 ("rect") is not built from vertices, so points cannot be set on it — the document was left unchanged',
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op for an empty array", () => {
		const doc = twoPolys();
		const before = JSON.stringify(doc);

		docOps.setPointsMany(doc, []);

		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches setPoints for a single entry", () => {
		const outline = [
			{ x: 0, y: 0 },
			{ x: 40, y: 0 },
			{ x: 40, y: 30 },
			{ x: 0, y: 30 },
		];
		const singleDoc = twoPolys();
		docOps.setPoints(singleDoc, "polygon-1", outline);

		const batchDoc = twoPolys();
		docOps.setPointsMany(batchDoc, [{ id: "polygon-1", points: outline }]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});
