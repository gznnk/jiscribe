import { describe, it, expect } from "vitest";

import { ZOOM } from "../../../constants/zoom";
import type { ObjectVisualBoundsRegistry } from "../../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcSelectionBounds } from "../calcSelectionBounds";
import { calcSelectionFitViewport } from "../calcSelectionFitViewport";
import { calcViewportForBounds } from "../calcViewportForBounds";

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

const toRecord = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

/** Viewport of 296x296 with the default padding leaves 200x200 available. */
const viewportSize = { width: 296, height: 296 };

describe("calcSelectionFitViewport", () => {
	it("centers the selection at the zoom that fits it", () => {
		// Selection 100x100 centered at (100, 100); 200x200 available -> zoom 2.
		const objects = toRecord([rect("a", 100, 100, 100, 100)]);
		expect(calcSelectionFitViewport(["a"], objects, viewportSize)).toEqual({
			width: 296,
			height: 296,
			zoom: 2,
			minX: 100 - 296 / 4,
			minY: 100 - 296 / 4,
		});
	});

	it("fits a selected group through its children, not its own empty frame", () => {
		const objects = toRecord([
			rect("a", 50, 50, 100, 100),
			rect("b", 150, 150, 100, 100),
			group("g", ["a", "b"]),
		]);
		expect(calcSelectionFitViewport(["g"], objects, viewportSize)).toEqual(
			calcSelectionFitViewport(["a", "b"], objects, viewportSize),
		);
	});

	it("ignores what is not selected, so the fit is tighter than a fit-to-content", () => {
		const objects = toRecord([
			rect("a", 100, 100, 100, 100),
			rect("far", 5000, 5000, 100, 100),
		]);
		const selectionZoom = calcSelectionFitViewport(
			["a"],
			objects,
			viewportSize,
		)?.zoom;
		const wholeZoom = calcSelectionFitViewport(
			["a", "far"],
			objects,
			viewportSize,
		)?.zoom;
		expect(selectionZoom).toBeGreaterThan(wholeZoom!);
	});

	it("returns null when there is no extent to fit", () => {
		const objects = toRecord([rect("a", 0, 0, 20, 20)]);
		expect(calcSelectionFitViewport([], objects, viewportSize)).toBeNull();
		expect(
			calcSelectionFitViewport(["missing"], objects, viewportSize),
		).toBeNull();
		expect(
			calcSelectionFitViewport(
				["a"],
				toRecord([rect("a", 10, 10, 0, 0)]),
				viewportSize,
			),
		).toBeNull();
	});

	it("defaults the padding to 48 screen px", () => {
		const objects = toRecord([rect("a", 100, 100, 100, 100)]);
		expect(calcSelectionFitViewport(["a"], objects, viewportSize)).toEqual(
			calcSelectionFitViewport(["a"], objects, {
				...viewportSize,
				padding: 48,
			}),
		);
	});

	it("zooms in further as the padding shrinks", () => {
		const objects = toRecord([rect("a", 100, 100, 100, 100)]);
		const padded = calcSelectionFitViewport(["a"], objects, {
			...viewportSize,
			padding: 48,
		});
		const tight = calcSelectionFitViewport(["a"], objects, {
			...viewportSize,
			padding: 0,
		});
		expect(tight!.zoom).toBeGreaterThan(padded!.zoom);
	});

	it("clamps the zoom for a selection far smaller than the viewport", () => {
		const objects = toRecord([rect("a", 0, 0, 1, 1)]);
		expect(
			calcSelectionFitViewport(["a"], objects, { width: 1000, height: 1000 })
				?.zoom,
		).toBe(ZOOM.MAX);
	});

	it("hands the selection's bounds to the shared viewport calculation", () => {
		// The two halves are tested on their own; this pins the composition.
		const objects = toRecord([
			rect("a", 0, 0, 100, 40),
			rect("b", 300, 200, 100, 40),
		]);
		const bounds = calcSelectionBounds(["a", "b"], objects);
		expect(calcSelectionFitViewport(["a", "b"], objects, viewportSize)).toEqual(
			calcViewportForBounds(bounds!, { ...viewportSize, padding: 48 }),
		);
	});

	it("keeps what a type draws outside its box inside the fit", () => {
		/** Stands in for a type drawing a 10px-tall strip below its box. */
		const stripBelowBox: Pick<ObjectVisualBoundsRegistry, "get"> = {
			get: () => (state) => ({
				x: -state.width / 2,
				y: -state.height / 2,
				width: state.width,
				height: state.height + 10,
			}),
		};
		const objects = toRecord([rect("a", 100, 100, 100, 100)]);
		const withStrip = calcSelectionFitViewport(
			["a"],
			objects,
			viewportSize,
			stripBelowBox,
		);
		// The taller extent has to fit in the same viewport, so the zoom drops.
		expect(withStrip!.zoom).toBeLessThan(
			calcSelectionFitViewport(["a"], objects, viewportSize)!.zoom,
		);
	});
});
