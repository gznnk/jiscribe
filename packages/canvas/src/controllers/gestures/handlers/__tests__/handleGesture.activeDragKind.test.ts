import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

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

/** A single selected rect, which every drag below starts from or acts on. */
const stateWithSelectedRect = (): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const rect = {
		id: "r1",
		type: "rect",
		cx: 100,
		cy: 100,
		width: 40,
		height: 40,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	} as unknown as ObjectState;
	return deepFreezeState({
		...base,
		objects: { ...base.objects, r1: rect },
		rootIds: [...base.rootIds, "r1"],
		selectedIds: ["r1"],
	});
};

const dragGesture = (
	type: "dragStart" | "dragEnd",
	target: { targetKind: string; targetId?: string; targetPart?: string },
): Gesture =>
	({
		type,
		button: 0,
		...target,
		start: { x: 100, y: 100 },
		last: { x: 120, y: 120 },
		clientLast: { x: 120, y: 120 },
		delta: { x: 20, y: 20 },
		clientDelta: { x: 20, y: 20 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

describe("handleGesture - activeDragKind", () => {
	it("is null while no drag is in progress", () => {
		expect(stateWithSelectedRect().activeDragKind).toBeNull();
	});

	it("is 'move' for the length of an object drag", () => {
		let state = stateWithSelectedRect();
		state = handleGesture(
			state,
			dragGesture("dragStart", { targetKind: "object", targetId: "r1" }),
			registries,
		);
		expect(state.activeDragKind).toBe("move");

		state = handleGesture(
			state,
			dragGesture("dragEnd", { targetKind: "object", targetId: "r1" }),
			registries,
		);
		expect(state.activeDragKind).toBeNull();
	});

	it("is 'transform' for a resize handle drag", () => {
		let state = stateWithSelectedRect();
		state = handleGesture(
			state,
			dragGesture("dragStart", {
				targetKind: "control",
				targetId: "transform",
				targetPart: "resize:bottomRight",
			}),
			registries,
		);
		expect(state.activeDragKind).toBe("transform");
	});

	it("is 'other' for a marquee on the canvas", () => {
		let state = stateWithSelectedRect();
		state = handleGesture(
			state,
			dragGesture("dragStart", { targetKind: "canvas", targetId: "canvas" }),
			registries,
		);
		expect(state.activeDragKind).toBe("other");
	});
});
