import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../../states/canvas/Viewport";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ZoomToSelectionCommand } from "../ZoomToSelectionCommand";

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

const makePolyline = (
	id: string,
	points: { x: number; y: number }[],
): PolylineState =>
	({ id, type: "polyline", points }) as unknown as PolylineState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	viewport?: Partial<Viewport>;
}): CanvasControllerState =>
	({
		selectedIds: params.selectedIds,
		objects: params.objects,
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 1000,
			zoom: 1,
			...params.viewport,
		},
	}) as unknown as CanvasControllerState;

const centerOf = (viewport: Viewport) => ({
	x: viewport.minX + viewport.width / (2 * viewport.zoom),
	y: viewport.minY + viewport.height / (2 * viewport.zoom),
});

describe("ZoomToSelectionCommand", () => {
	it("centers on the bounds of selected objects (ignoring unselected ones)", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: {
				a: makeRect("a", 500, 500),
				// A far-away unselected object does not affect the center calculation
				b: makeRect("b", 5000, 5000),
			},
		});
		const next = ZoomToSelectionCommand.execute(state);
		const center = centerOf(next.viewport);
		expect(center.x).toBeCloseTo(500, 2);
		expect(center.y).toBeCloseTo(500, 2);
	});

	it("picks a zoom level that fits the selected content (including 48px padding)", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a", 500, 500) },
		});
		const next = ZoomToSelectionCommand.execute(state);
		// 200x200 → 904/200 = 4.52
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
	});

	it("fits to the valid axis even when one axis has size 0 (a horizontal line)", () => {
		// Horizontal polyline: width 200, height 0. Does not fall back (zoom=1) just because height is 0
		const state = makeState({
			selectedIds: ["line"],
			objects: {
				line: makePolyline("line", [
					{ x: 400, y: 500 },
					{ x: 600, y: 500 },
				]),
			},
		});
		const next = ZoomToSelectionCommand.execute(state);
		// Fits to width 200 -> 904/200 = 4.52 (the height axis is excluded from candidates)
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
		const center = centerOf(next.viewport);
		expect(center.x).toBeCloseTo(500, 2);
		expect(center.y).toBeCloseTo(500, 2);
	});

	it("fits a selected connector using its resolved endpoints, not just its waypoints", () => {
		// A straight connector has an empty points array; fitting must use the
		// resolved endpoints (400,500)-(600,500) -> width 200 centered at (500,500).
		const connector: ObjectState = {
			id: "c1",
			type: "connector",
			points: [],
			routing: "straight",
			source: { anchor: { kind: "free", point: { x: 400, y: 500 } } },
			target: { anchor: { kind: "free", point: { x: 600, y: 500 } } },
		} as unknown as ObjectState;
		const state = makeState({
			selectedIds: ["c1"],
			objects: { c1: connector },
			viewport: { minX: 123, minY: 456, zoom: 2 },
		});
		const next = ZoomToSelectionCommand.execute(state);
		// Previously the connector fell into the isPoly branch (empty points -> no-op)
		expect(next).not.toBe(state);
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
		const center = centerOf(next.viewport);
		expect(center.x).toBeCloseTo(500, 2);
		expect(center.y).toBeCloseTo(500, 2);
	});

	it("keeps the current view when both axes have size 0 (a degenerate poly with all vertices identical) (no-op)", () => {
		// A poly collapsed to a single point has contentWidth=contentHeight=0. With no zoom
		// candidate, it keeps the current viewport instead of snapping to 100% and recentering.
		const state = makeState({
			selectedIds: ["dot"],
			objects: {
				dot: makePolyline("dot", [
					{ x: 500, y: 500 },
					{ x: 500, y: 500 },
				]),
			},
			viewport: { minX: 123, minY: 456, zoom: 2 },
		});
		expect(ZoomToSelectionCommand.execute(state)).toBe(state);
	});

	describe("canExecute", () => {
		it("is executable when there is a selection", () => {
			expect(
				ZoomToSelectionCommand.canExecute(
					makeState({
						selectedIds: ["a"],
						objects: { a: makeRect("a", 0, 0) },
					}),
				),
			).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				ZoomToSelectionCommand.canExecute(
					makeState({ selectedIds: [], objects: {} }),
				),
			).toBe(false);
		});
	});
});
