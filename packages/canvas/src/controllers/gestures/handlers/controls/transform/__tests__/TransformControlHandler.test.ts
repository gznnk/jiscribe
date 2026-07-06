import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { TransformControlHandler } from "../TransformControlHandler";

const handler = new TransformControlHandler();

const makeRect = (id: string) =>
	({
		id,
		type: "rect",
		cx: 50,
		cy: 50,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown;

/**
 * Build a state during a resize drag on a single selected rect. Set
 * snapCandidates to null to disable inter-object snapping.
 */
const makeDragState = (): CanvasControllerState => {
	const rect = makeRect("rect-1");
	return {
		objects: { "rect-1": rect },
		rootIds: ["rect-1"],
		selectedIds: ["rect-1"],
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "rect-1": rect },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: ["rect-1"],
			selectedIdsWithDescendants: new Set(["rect-1"]),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const makeDragEndEvent = (last: { x: number; y: number }): CanvasEvent =>
	({
		type: "dragEnd",
		targetKind: "control",
		targetId: "transform-control:bottomRight",
		button: 0,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const rectOf = (state: CanvasControllerState) =>
	state.objects["rect-1"] as unknown as {
		cx: number;
		cy: number;
		width: number;
		height: number;
	};

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

describe("TransformControlHandler - handleDragEnd", () => {
	it("computes the final state from a deep-frozen input without mutating it", () => {
		const state = deepFreeze(makeDragState());

		// Drag the bottomRight anchor from (100, 100) to (150, 130):
		// the topLeft corner stays fixed at (0, 0)
		const next = handler.handle(state, makeDragEndEvent({ x: 150, y: 130 }));

		expect(rectOf(next)).toMatchObject({
			cx: 75,
			cy: 65,
			width: 150,
			height: 130,
		});
		expect(next.edgeScrollEnabled).toBe(false);
		// The frozen input state must be left untouched
		expect(rectOf(state)).toMatchObject({
			cx: 50,
			cy: 50,
			width: 100,
			height: 100,
		});
	});
});
