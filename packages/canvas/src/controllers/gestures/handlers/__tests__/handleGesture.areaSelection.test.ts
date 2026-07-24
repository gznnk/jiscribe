import { describe, expect, it } from "vitest";

import { MULTI_SELECT_GROUP } from "../../../../constants/multiSelectGroup";
import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

const registries = createTestRegistries();

const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

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

/** State seeded with three rects; two inside the sweep area, one far outside. */
const stateWithRects = (): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const objects: Record<string, ObjectState> = {
		...base.objects,
		r1: rect("r1", 50, 50, 40, 40), // bbox 30..70
		r2: rect("r2", 150, 150, 40, 40), // bbox 130..170
		far: rect("far", 900, 900, 40, 40), // bbox 880..920 — outside
	};
	return deepFreezeState({
		...base,
		objects,
		rootIds: [...base.rootIds, "r1", "r2", "far"],
	});
};

const dragGesture = (
	type: "dragStart" | "drag" | "dragEnd",
	startX: number,
	startY: number,
	lastX: number,
	lastY: number,
): Gesture =>
	({
		type,
		button: 0,
		targetKind: "canvas",
		targetId: "canvas",
		start: { x: startX, y: startY },
		last: { x: lastX, y: lastY },
		clientLast: { x: lastX, y: lastY },
		clientDelta: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

describe("handleGesture - area selection (marquee)", () => {
	it("builds bboxes at dragStart and selects only fully-contained objects", () => {
		let state = stateWithRects();

		// dragStart: eventStartSnapshot (and its bboxes) is created here.
		state = handleGesture(
			state,
			dragGesture("dragStart", 0, 0, 0, 0),
			registries,
		);
		expect(state.eventStartSnapshot).not.toBeNull();
		expect(state.eventStartSnapshot?.bboxes.r1).toEqual({
			left: 30,
			top: 30,
			right: 70,
			bottom: 70,
		});
		// Connectors / the far rect aside, the map covers the on-canvas shapes.
		expect(state.eventStartSnapshot?.bboxes.far).toBeDefined();

		// drag a rectangle that fully contains r1 + r2 but not `far`.
		state = handleGesture(
			state,
			dragGesture("drag", 0, 0, 200, 200),
			registries,
		);

		expect([...state.selectedIds].sort()).toEqual(["r1", "r2"]);
		expect(state.selectedIds).not.toContain("far");

		// Two objects selected -> a transient multi-select group wraps them.
		expect(state.multiSelectGroup?.id).toBe(MULTI_SELECT_GROUP.ID);
		expect(state.multiSelectGroup?.cx).toBeCloseTo(100); // (30+170)/2
		expect(state.multiSelectGroup?.cy).toBeCloseTo(100);
		expect(state.multiSelectGroup?.width).toBeCloseTo(140); // 170-30
		expect(state.multiSelectGroup?.height).toBeCloseTo(140);
	});

	it("selects nothing when the sweep contains no object fully", () => {
		let state = stateWithRects();
		state = handleGesture(
			state,
			dragGesture("dragStart", 0, 0, 0, 0),
			registries,
		);
		// Area 0..50 clips r1 (30..70) — partial overlap, so not selected.
		state = handleGesture(state, dragGesture("drag", 0, 0, 50, 50), registries);
		expect(state.selectedIds).toEqual([]);
		expect(state.multiSelectGroup).toBeNull();
	});

	it("clears eventStartSnapshot on dragEnd", () => {
		let state = stateWithRects();
		state = handleGesture(
			state,
			dragGesture("dragStart", 0, 0, 0, 0),
			registries,
		);
		state = handleGesture(
			state,
			dragGesture("drag", 0, 0, 200, 200),
			registries,
		);
		state = handleGesture(
			state,
			dragGesture("dragEnd", 0, 0, 200, 200),
			registries,
		);
		expect(state.eventStartSnapshot).toBeNull();
	});
});
