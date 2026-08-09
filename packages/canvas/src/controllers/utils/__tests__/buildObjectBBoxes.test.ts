import { calcFrameKeyPoints, calcPolyKeyPoints } from "@jiscribe/geometry";
import type { FrameKeyPoints, TransformedFrame } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { buildObjectBBoxes, calcUnionBoundingBox } from "../buildObjectBBoxes";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
): ObjectState => ({ id, type: "polyline", points }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): ObjectState =>
	({ id, type: "group", childIds }) as unknown as ObjectState;

const connector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 100 } } },
	}) as unknown as ObjectState;

/** Build the keyPoints slice the same way handleGesture does (frames + non-connector polys). */
const keyPointsFor = (
	objects: Record<string, ObjectState>,
): Record<string, FrameKeyPoints> => {
	const keyPoints: Record<string, FrameKeyPoints> = {};
	for (const [id, obj] of Object.entries(objects)) {
		if (obj.type === "rect") {
			keyPoints[id] = calcFrameKeyPoints(obj as unknown as TransformedFrame);
		} else if (obj.type === "polyline") {
			const kp = calcPolyKeyPoints(
				(obj as unknown as { points: { x: number; y: number }[] }).points,
			);
			if (kp) {
				keyPoints[id] = kp;
			}
		}
	}
	return keyPoints;
};

describe("buildObjectBBoxes", () => {
	it("derives a frame bbox from keyPoints", () => {
		const objects = { r: rect("r", 50, 50, 40, 40) };
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.r).toEqual({ left: 30, top: 30, right: 70, bottom: 70 });
	});

	it("derives a poly bbox from keyPoints", () => {
		const objects = {
			p: poly("p", [
				{ x: 10, y: 20 },
				{ x: 40, y: 60 },
			]),
		};
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.p).toEqual({ left: 10, top: 20, right: 40, bottom: 60 });
	});

	it("omits a poly with empty points (no keyPoints entry)", () => {
		const objects = { p: poly("p", []) };
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.p).toBeUndefined();
	});

	it("excludes connectors even though they appear in the object map", () => {
		const objects = { c: connector("c"), r: rect("r", 0, 0, 10, 10) };
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.c).toBeUndefined();
		expect(bboxes.r).toBeDefined();
	});

	it("computes a group bbox as the union of its children", () => {
		const objects = {
			r1: rect("r1", 0, 0, 20, 20), // -10..10
			r2: rect("r2", 100, 0, 20, 20), // 90..110
			g: group("g", ["r1", "r2"]),
		};
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.g).toEqual({ left: -10, top: -10, right: 110, bottom: 10 });
	});

	it("computes nested group bboxes bottom-up", () => {
		const objects = {
			r1: rect("r1", 0, 0, 20, 20), // -10..10
			inner: group("inner", ["r1"]),
			r2: rect("r2", 100, 0, 20, 20), // 90..110
			outer: group("outer", ["inner", "r2"]),
		};
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.inner).toEqual({
			left: -10,
			top: -10,
			right: 10,
			bottom: 10,
		});
		expect(bboxes.outer).toEqual({
			left: -10,
			top: -10,
			right: 110,
			bottom: 10,
		});
	});

	it("returns no group entry when the group has no valid children", () => {
		const objects = { g: group("g", ["missing"]) };
		const bboxes = buildObjectBBoxes(objects, keyPointsFor(objects));
		expect(bboxes.g).toBeUndefined();
	});
});

describe("calcUnionBoundingBox", () => {
	it("unions the bboxes of the given ids", () => {
		const bboxes = {
			a: { left: 0, top: 0, right: 10, bottom: 10 },
			b: { left: 100, top: 50, right: 120, bottom: 80 },
		};
		expect(calcUnionBoundingBox(["a", "b"], bboxes)).toEqual({
			left: 0,
			top: 0,
			right: 120,
			bottom: 80,
		});
	});

	it("skips ids absent from the map and returns null when none resolve", () => {
		const bboxes = { a: { left: 0, top: 0, right: 10, bottom: 10 } };
		expect(calcUnionBoundingBox(["a", "missing"], bboxes)).toEqual({
			left: 0,
			top: 0,
			right: 10,
			bottom: 10,
		});
		expect(calcUnionBoundingBox(["missing"], bboxes)).toBeNull();
	});
});
