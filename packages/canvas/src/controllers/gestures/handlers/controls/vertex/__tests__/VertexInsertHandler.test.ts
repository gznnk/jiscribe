import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { VertexInsertHandler } from "../VertexInsertHandler";

const handler = new VertexInsertHandler();

const makePoly = (id: string, points: Point[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown;

/**
 * Build a state before a vertex-insert drag. Set snapCandidates to null to
 * disable inter-object snapping.
 */
const makeState = (points: Point[]): CanvasControllerState => {
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

const makeEvent = (
	type: "dragStart" | "drag" | "dragEnd",
	last: Point,
	segmentIndex = 0,
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: "poly-1",
		targetPart: `vertex-insert:${segmentIndex}`,
		button: 0,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const pointsOf = (state: CanvasControllerState) =>
	(state.objects["poly-1"] as unknown as { points: Point[] }).points;

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

describe("VertexInsertHandler - handleDragEnd", () => {
	it("computes the final state from a deep-frozen input without mutating it", () => {
		// dragStart inserts a new vertex on segment 0 at the pointer position
		const afterStart = handler.handle(
			makeState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			makeEvent("dragStart", { x: 50, y: 0 }),
		);
		expect(pointsOf(afterStart)).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 100, y: 0 },
		]);

		// dragEnd commits the inserted vertex at the final pointer position
		const frozen = deepFreeze(afterStart);
		const next = handler.handle(frozen, makeEvent("dragEnd", { x: 60, y: 40 }));

		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 60, y: 40 },
			{ x: 100, y: 0 },
		]);
		expect(next.edgeScrollEnabled).toBe(false);
		// The frozen input state must be left untouched
		expect(pointsOf(frozen)[1]).toEqual({ x: 50, y: 0 });
	});
});
