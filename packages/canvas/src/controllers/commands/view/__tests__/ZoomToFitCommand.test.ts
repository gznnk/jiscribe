import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../../states/canvas/Viewport";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ZoomToFitCommand } from "../ZoomToFitCommand";

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 200,
		height: 200,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeGroup = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as GroupState;

const makePolyline = (
	id: string,
	points: { x: number; y: number }[],
): PolylineState =>
	({ id, type: "polyline", points }) as unknown as PolylineState;

const makeState = (
	objects: Record<string, ObjectState>,
	viewport: Partial<Viewport> = {},
): CanvasControllerState =>
	({
		objects,
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 1000,
			zoom: 1,
			...viewport,
		},
	}) as unknown as CanvasControllerState;

const centerOf = (viewport: Viewport) => ({
	x: viewport.minX + viewport.width / (2 * viewport.zoom),
	y: viewport.minY + viewport.height / (2 * viewport.zoom),
});

describe("ZoomToFitCommand", () => {
	it("centers so that the bounds of all objects fit", () => {
		// rect is cx=500,cy=500,200x200 -> bbox 400..600. Content center is (500,500)
		const state = makeState({ a: makeRect("a", 500, 500) });
		const next = ZoomToFitCommand.execute(state);
		const center = centerOf(next.viewport);
		expect(center.x).toBeCloseTo(500, 2);
		expect(center.y).toBeCloseTo(500, 2);
	});

	it("picks a zoom level that fits the content in the viewport (including 48px padding)", () => {
		const state = makeState({ a: makeRect("a", 500, 500) });
		const next = ZoomToFitCommand.execute(state);
		// contentWidth=200, availableW = 1000 - 2*48 = 904 → 904/200 = 4.52
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
	});

	it("excludes the group itself from bounds calculation (uses children instead)", () => {
		const state = makeState({
			g: makeGroup("g", ["a"]),
			a: makeRect("a", 500, 500),
		});
		const next = ZoomToFitCommand.execute(state);
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
	});

	it("returns state unchanged when there are no fittable shapes", () => {
		const state = makeState({ g: makeGroup("g", []) });
		expect(ZoomToFitCommand.execute(state)).toBe(state);
	});

	it("keeps the current view when only zero-size targets exist (a degenerate poly with 0 size on both axes) (no-op)", () => {
		// A canvas with only a poly collapsed to a single point has contentWidth=contentHeight=0.
		// With no zoom candidate, it keeps the current viewport instead of jumping to 100%.
		const state = makeState(
			{
				dot: makePolyline("dot", [
					{ x: 500, y: 500 },
					{ x: 500, y: 500 },
				]),
			},
			{ minX: 123, minY: 456, zoom: 2 },
		);
		expect(ZoomToFitCommand.execute(state)).toBe(state);
	});

	describe("canExecute", () => {
		it("is executable when objects exist", () => {
			expect(
				ZoomToFitCommand.canExecute(makeState({ a: makeRect("a", 0, 0) })),
			).toBe(true);
		});

		it("is not executable when there are no objects", () => {
			expect(ZoomToFitCommand.canExecute(makeState({}))).toBe(false);
		});
	});
});
