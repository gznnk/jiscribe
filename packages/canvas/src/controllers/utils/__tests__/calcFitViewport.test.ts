import { beforeAll, describe, expect, it } from "vitest";

import { ZOOM } from "../../../constants/zoom";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { calcFitViewport } from "../calcFitViewport";

beforeAll(() => {
	initializeObjectRegistry();
});

/** Axis-aligned (unrotated) Frame-family state. bbox is trivial: left=cx-w/2, etc. */
const rectObj = (
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

/** Pure Poly state that does not satisfy the Frame condition (exercises the isPoly branch). */
const polylineObj = (
	id: string,
	points: { x: number; y: number }[],
): ObjectState =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown as ObjectState;

const toRecord = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

describe("calcFitViewport", () => {
	it("returns null when there are no objects", () => {
		expect(calcFitViewport({}, { width: 800, height: 600 })).toBeNull();
	});

	it("fits a single rectangle to the viewport center and computes zoom and origin", () => {
		// bbox: left=0, right=200, top=50, bottom=150 -> center (100,100), 200x100
		const objects = toRecord([rectObj("r1", 100, 100, 200, 100)]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 50,
		});

		// horizontal: (800-100)/200=3.5, vertical: (600-100)/100=5 -> the tighter 3.5
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(3.5, 4);
		expect(viewport!.width).toBe(800);
		expect(viewport!.height).toBe(600);
		// minX = cx - width/(2*zoom) = 100 - 800/7
		expect(viewport!.minX).toBeCloseTo(100 - 800 / 7, 3);
		expect(viewport!.minY).toBeCloseTo(100 - 600 / 7, 3);
	});

	it("fits to the union bound of multiple objects", () => {
		const objects = toRecord([
			rectObj("r1", 50, 50, 100, 100), // left0 top0 right100 bottom100
			rectObj("r2", 350, 250, 100, 100), // left300 top200 right400 bottom300
		]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		// union: 400x300, center (200,150)
		// horizontal 800/400=2, vertical 600/300=2 -> 2
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(2, 4);
		expect(viewport!.minX).toBeCloseTo(200 - 800 / 4, 3);
		expect(viewport!.minY).toBeCloseTo(150 - 600 / 4, 3);
	});

	it("groups are excluded (null if only a group)", () => {
		const group = {
			id: "g1",
			type: "group",
			cx: 100,
			cy: 100,
			width: 200,
			height: 200,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds: [],
		} as unknown as ObjectState;

		expect(
			calcFitViewport(toRecord([group]), { width: 800, height: 600 }),
		).toBeNull();
	});

	it("ignores the group and fits using only the non-group objects it contains", () => {
		const group = {
			id: "g1",
			type: "group",
			cx: 0,
			cy: 0,
			width: 10000,
			height: 10000,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds: ["r1"],
		} as unknown as ObjectState;
		const rect = rectObj("r1", 100, 100, 200, 100);

		const withGroup = calcFitViewport(toRecord([group, rect]), {
			width: 800,
			height: 600,
			padding: 50,
		});
		const rectOnly = calcFitViewport(toRecord([rect]), {
			width: 800,
			height: 600,
			padding: 50,
		});

		// not dragged by the group's huge bound; same result as the rect alone
		expect(withGroup).toEqual(rectOnly);
	});

	it("includes the bound of a Poly (polyline)", () => {
		const objects = toRecord([
			polylineObj("p1", [
				{ x: 0, y: 0 },
				{ x: 200, y: 100 },
			]),
		]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 50,
		});

		// bbox 200x100, center (100,50) -> same zoom as the rectangle case
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(3.5, 4);
		expect(viewport!.minX).toBeCloseTo(100 - 800 / 7, 3);
		expect(viewport!.minY).toBeCloseTo(50 - 600 / 7, 3);
	});

	it("includes the bound of a free-endpoint connector", () => {
		const connector = {
			id: "c1",
			type: "connector",
			routing: "straight",
			points: [],
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 200, y: 100 } } },
		} as unknown as ObjectState;

		const viewport = calcFitViewport(toRecord([connector]), {
			width: 800,
			height: 600,
			padding: 50,
		});

		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(3.5, 4);
	});

	it("clamps to ZOOM.MAX when content is small and the zoom exceeds the upper limit", () => {
		const objects = toRecord([rectObj("r1", 0, 0, 10, 10)]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		// horizontal 80, vertical 60 -> both exceed ZOOM.MAX(10)
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBe(ZOOM.MAX);
	});

	it("clamps to ZOOM.MIN when content is huge and the zoom falls below the lower limit", () => {
		const objects = toRecord([rectObj("r1", 0, 0, 100_000, 100_000)]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBe(ZOOM.MIN);
	});

	it("degenerate content with zero size on both axes (single-point Poly) returns null", () => {
		const objects = toRecord([polylineObj("p1", [{ x: 42, y: 42 }])]);

		expect(calcFitViewport(objects, { width: 800, height: 600 })).toBeNull();
	});

	it("fits by the zoom of the spanning axis even when only one axis has extent", () => {
		// horizontal 2-point polyline: width=200, height=0
		const objects = toRecord([
			polylineObj("p1", [
				{ x: 0, y: 50 },
				{ x: 200, y: 50 },
			]),
		]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		// height=0 is excluded from the candidates, so horizontal 800/200=4 is used
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(4, 4);
	});
});
