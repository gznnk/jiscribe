import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { VertexControlHandler } from "../VertexControlHandler";

const handler = new VertexControlHandler();

const makePoly = (id: string, points: Point[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown;

/**
 * Build a state during a vertex drag. Set snapCandidates to null to disable
 * inter-object snapping so that only the Shift axis-lock logic can be verified.
 */
const makeDragState = (points: Point[]): CanvasControllerState => {
	const poly = makePoly("poly-1", points);
	return {
		objects: { "poly-1": poly },
		rootIds: ["poly-1"],
		selectedIds: [],
		selectedVertex: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "poly-1": poly },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: [],
			selectedIdsWithDescendants: new Set(),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const makeDragEvent = (
	last: Point,
	shift: boolean,
	vertexIndex = 0,
): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: `vertex-control:poly-1:${vertexIndex}`,
		button: 0,
		last,
		mods: { shift, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const vertexAt = (state: CanvasControllerState, index: number) =>
	(state.objects["poly-1"] as unknown as { points: Point[] }).points[index];

/**
 * Recursively freeze a state so any mutation inside the handler throws
 * (strict mode). Guards the "handlers never mutate their input" contract.
 */
const deepFreeze = <T>(target: T): T => {
	if (target && typeof target === "object" && !Object.isFrozen(target)) {
		Object.freeze(target);
		for (const value of Object.values(target)) {
			deepFreeze(value);
		}
	}
	return target;
};

describe("VertexControlHandler - Shift axis lock", () => {
	it("without Shift, the vertex follows the cursor position and no feedback is shown", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 30, y: 12 }, false),
		);
		expect(vertexAt(next, 0)).toEqual({ x: 30, y: 12 });
		expect(next.axisLockFeedback).toBeNull();
	});

	it("with Shift and horizontal dominance, locks Y to the start position and moves only X", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 20, y: 30 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 70, y: 38 }, true),
		);
		expect(vertexAt(next, 0)).toEqual({ x: 70, y: 30 });
		expect(next.axisLockFeedback).toEqual({ y: 30 });
	});

	it("with Shift and vertical dominance, locks X to the start position and moves only Y", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 20, y: 30 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 25, y: 80 }, true),
		);
		expect(vertexAt(next, 0)).toEqual({ x: 20, y: 80 });
		expect(next.axisLockFeedback).toEqual({ x: 20 });
	});

	describe("origin snap (near the start vertex)", () => {
		it("snaps to the start vertex and shows both-axis guides when the free-axis movement is within the threshold", () => {
			const next = handler.handle(
				makeDragState([
					{ x: 20, y: 30 },
					{ x: 100, y: 0 },
				]),
				// dx=4 (dominant/free axis), dy=3 -> 4 <= 6px (zoom=1), snaps to origin
				makeDragEvent({ x: 24, y: 33 }, true),
			);
			expect(vertexAt(next, 0)).toEqual({ x: 20, y: 30 });
			expect(next.axisLockFeedback).toEqual({ x: 20, y: 30 });
		});

		it("beyond the threshold, snapping releases and it returns to single-axis lock", () => {
			const next = handler.handle(
				makeDragState([
					{ x: 20, y: 30 },
					{ x: 100, y: 0 },
				]),
				// dx=8 > 6px -> horizontal movement with Y locked
				makeDragEvent({ x: 28, y: 33 }, true),
			);
			expect(vertexAt(next, 0)).toEqual({ x: 28, y: 30 });
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});
	});
});

describe("VertexControlHandler - handleDragEnd", () => {
	it("computes the final state from a deep-frozen input without mutating it", () => {
		const state = deepFreeze(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
		);
		const event = {
			...makeDragEvent({ x: 30, y: 12 }, false),
			type: "dragEnd",
		} as CanvasEvent;

		const next = handler.handle(state, event);

		expect(vertexAt(next, 0)).toEqual({ x: 30, y: 12 });
		expect(next.edgeScrollEnabled).toBe(false);
		// The frozen input state must be left untouched
		expect(vertexAt(state, 0)).toEqual({ x: 0, y: 0 });
	});
});
