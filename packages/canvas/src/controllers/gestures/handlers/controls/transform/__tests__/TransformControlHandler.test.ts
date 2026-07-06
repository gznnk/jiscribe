import { beforeAll, describe, expect, it } from "vitest";

import { MIN_GROUP_DIMENSION } from "../../../../../../constants/groupDimensions";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../../../setup/initializeObjectRegistry";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { TransformControlHandler } from "../TransformControlHandler";

beforeAll(() => {
	initializeObjectRegistry();
});

const makeRect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "rect",
		parentId,
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const makeGroup = (
	id: string,
	childIds: string[],
	frame: { cx: number; cy: number; width: number; height: number },
): GroupState =>
	({
		id,
		type: "group",
		childIds,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...frame,
	}) as unknown as GroupState;

/**
 * Builds the minimal controller state needed to drive a resize drag:
 * a single selected group "g" (100x100 at center 50,50) with one child rect.
 */
const makeGroupResizeState = (): CanvasControllerState => {
	const group = makeGroup("g", ["a"], {
		cx: 50,
		cy: 50,
		width: 100,
		height: 100,
	});
	const child = makeRect("a", 50, 50, 100, 100, "g");
	const objects: Record<string, ObjectState> = {
		g: group as unknown as ObjectState,
		a: child,
	};
	const viewport = { minX: 0, minY: 0, width: 1000, height: 800, zoom: 1 };

	return {
		objects,
		rootIds: ["g"],
		selectedIds: ["g"],
		viewport,
		multiSelectGroup: null,
		snapFeedback: { x: [], y: [] },
		eventStartSnapshot: {
			objects,
			keyPoints: {},
			bboxes: {},
			snapCandidates: { x: [], y: [] },
			selectedIds: ["g"],
			selectedIdsWithDescendants: new Set(["g", "a"]),
			multiSelectGroup: null,
			viewport,
		},
	} as unknown as CanvasControllerState;
};

/**
 * Build a state during a resize drag on a single selected rect. Set
 * snapCandidates to null to disable inter-object snapping.
 */
const makeDragState = (): CanvasControllerState => {
	const rect = makeRect("rect-1", 50, 50, 100, 100);
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

/** A drag on the bottomRight anchor with the cursor at (x, y). Ctrl skips snapping. */
const makeDragEvent = (x: number, y: number): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: "transform",
		targetPart: "resize:bottomRight",
		button: 0,
		mods: { ctrl: true, shift: false, alt: false, meta: false },
		last: { x, y },
	}) as unknown as CanvasEvent;

const makeDragEndEvent = (last: { x: number; y: number }): CanvasEvent =>
	({
		type: "dragEnd",
		targetKind: "control",
		targetId: "transform",
		targetPart: "resize:bottomRight",
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

describe("TransformControlHandler", () => {
	describe("group resize minimum (GroupState invariant, issue #35)", () => {
		it("dragging the anchor onto the opposite corner cannot shrink a group to zero", () => {
			const handler = new TransformControlHandler();
			const state = makeGroupResizeState();

			// bottomRight anchor dragged exactly onto the topLeft corner (0,0):
			// the raw new width/height are 0 and must be floored, not committed
			const next = handler.handle(state, makeDragEvent(0, 0));

			const group = next.objects["g"] as GroupState;
			expect(group.width).toBeGreaterThanOrEqual(MIN_GROUP_DIMENSION);
			expect(group.height).toBeGreaterThanOrEqual(MIN_GROUP_DIMENSION);

			// the child is scaled by end/start size — it must survive, not collapse to 0
			const child = next.objects["a"] as unknown as {
				cx: number;
				cy: number;
				width: number;
				height: number;
			};
			expect(child.width).toBeGreaterThan(0);
			expect(child.height).toBeGreaterThan(0);
			expect(Number.isFinite(child.cx)).toBe(true);
			expect(Number.isFinite(child.cy)).toBe(true);
		});

		it("a normal resize is not affected by the minimum floor", () => {
			const handler = new TransformControlHandler();
			const state = makeGroupResizeState();

			// bottomRight anchor dragged to (200, 150): width 200, height 150
			const next = handler.handle(state, makeDragEvent(200, 150));

			const group = next.objects["g"] as GroupState;
			expect(group.width).toBeCloseTo(200);
			expect(group.height).toBeCloseTo(150);
		});
	});

	describe("handleDragEnd", () => {
		it("computes the final state from a deep-frozen input without mutating it", () => {
			const handler = new TransformControlHandler();
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
});
