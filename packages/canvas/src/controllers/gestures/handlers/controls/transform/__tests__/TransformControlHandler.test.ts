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

/** A drag on the bottomRight anchor with the cursor at (x, y). Ctrl skips snapping. */
const makeDragEvent = (x: number, y: number): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: "transform-control:bottomRight",
		button: 0,
		mods: { ctrl: true, shift: false, alt: false, meta: false },
		last: { x, y },
	}) as unknown as CanvasEvent;

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
});
