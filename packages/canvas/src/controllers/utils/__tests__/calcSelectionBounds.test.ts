import { describe, it, expect } from "vitest";

import type { ObjectVisualBoundsRegistry } from "../../../presentations/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcSelectionBounds } from "../calcSelectionBounds";

/** Axis-aligned Frame-family state: bbox is left=cx-w/2, top=cy-h/2, ... */
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

const group = (id: string, childIds: string[]): ObjectState =>
	({
		id,
		type: "group",
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds,
	}) as unknown as ObjectState;

/** Poly with no points: calcObjectBoundingBox has no extent for it. */
const emptyPolyline = (id: string): ObjectState =>
	({ id, type: "polyline", points: [] }) as unknown as ObjectState;

const toRecord = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

describe("calcSelectionBounds", () => {
	it("returns null for an empty selection", () => {
		expect(
			calcSelectionBounds([], toRecord([rect("a", 0, 0, 20, 20)])),
		).toBeNull();
	});

	it("returns the object's own box for a single selected object", () => {
		expect(
			calcSelectionBounds(["a"], toRecord([rect("a", 50, 50, 100, 60)])),
		).toEqual({ left: 0, top: 20, right: 100, bottom: 80 });
	});

	it("unions only what is selected, leaving the rest of the canvas out", () => {
		const objects = toRecord([
			rect("a", 0, 0, 20, 20),
			rect("b", 100, 100, 20, 20),
			rect("far", 1000, 1000, 20, 20),
		]);
		expect(calcSelectionBounds(["a", "b"], objects)).toEqual({
			left: -10,
			top: -10,
			right: 110,
			bottom: 110,
		});
	});

	it("measures a selected group through its children", () => {
		const objects = toRecord([
			rect("a", 0, 0, 20, 20),
			rect("b", 100, 100, 20, 20),
			group("g", ["a", "b"]),
		]);
		expect(calcSelectionBounds(["g"], objects)).toEqual({
			left: -10,
			top: -10,
			right: 110,
			bottom: 110,
		});
	});

	it("reaches a nested group's grandchildren", () => {
		const objects = toRecord([
			rect("a", 0, 0, 20, 20),
			rect("b", 200, 200, 20, 20),
			group("inner", ["b"]),
			group("outer", ["a", "inner"]),
		]);
		expect(calcSelectionBounds(["outer"], objects)).toEqual({
			left: -10,
			top: -10,
			right: 210,
			bottom: 210,
		});
	});

	it("ignores the group's own zero-sized frame, which would otherwise pull the box to the origin", () => {
		const objects = toRecord([
			rect("a", 500, 500, 100, 100),
			group("g", ["a"]),
		]);
		expect(calcSelectionBounds(["g"], objects)).toEqual({
			left: 450,
			top: 450,
			right: 550,
			bottom: 550,
		});
	});

	it("returns null for a group with no children", () => {
		expect(calcSelectionBounds(["g"], toRecord([group("g", [])]))).toBeNull();
	});

	it("skips ids absent from the map", () => {
		const objects = toRecord([rect("a", 0, 0, 20, 20)]);
		expect(calcSelectionBounds(["a", "missing"], objects)).toEqual({
			left: -10,
			top: -10,
			right: 10,
			bottom: 10,
		});
	});

	it("returns null when every selected id is unknown", () => {
		expect(calcSelectionBounds(["nope"], {})).toBeNull();
	});

	it("skips selected objects with no extent", () => {
		const objects = toRecord([rect("a", 0, 0, 20, 20), emptyPolyline("p")]);
		expect(calcSelectionBounds(["a", "p"], objects)).toEqual({
			left: -10,
			top: -10,
			right: 10,
			bottom: 10,
		});
	});

	it("returns null when nothing selected contributes an extent", () => {
		expect(
			calcSelectionBounds(["p"], toRecord([emptyPolyline("p")])),
		).toBeNull();
	});

	it("counts an object selected alongside its group exactly once", () => {
		const objects = toRecord([
			rect("a", 0, 0, 20, 20),
			rect("b", 100, 100, 20, 20),
			group("g", ["a", "b"]),
		]);
		expect(calcSelectionBounds(["g", "a"], objects)).toEqual(
			calcSelectionBounds(["g"], objects),
		);
	});

	it("keeps a zero-sized object as a degenerate extent rather than dropping it", () => {
		expect(
			calcSelectionBounds(["a"], toRecord([rect("a", 10, 10, 0, 0)])),
		).toEqual({ left: 10, top: 10, right: 10, bottom: 10 });
	});

	describe("visual bounds", () => {
		/** Stands in for a type drawing a 10px-tall strip below its box. */
		const stripBelowBox: Pick<ObjectVisualBoundsRegistry, "get"> = {
			get: () => (state) => ({
				x: -state.width / 2,
				y: -state.height / 2,
				width: state.width,
				height: state.height + 10,
			}),
		};

		it("includes what a type draws outside its box, so a fit cannot crop it", () => {
			const objects = toRecord([rect("a", 50, 50, 100, 60)]);
			expect(calcSelectionBounds(["a"], objects, stripBelowBox)).toEqual({
				left: 0,
				top: 20,
				right: 100,
				bottom: 90,
			});
		});

		it("reproduces the geometry-only result when the registry is omitted", () => {
			const objects = toRecord([rect("a", 50, 50, 100, 60)]);
			expect(calcSelectionBounds(["a"], objects, null)).toEqual(
				calcSelectionBounds(["a"], objects),
			);
		});
	});
});
