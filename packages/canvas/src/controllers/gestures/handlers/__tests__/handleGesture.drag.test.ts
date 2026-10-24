import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
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
		selection: selectionOf(["r1"]),
	});
};

const dragGesture = (
	type: "dragStart" | "dragEnd",
	target: { targetKind: string; targetId?: string; targetAction?: string },
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

describe("handleGesture - drag", () => {
	it("is null while no drag is in progress", () => {
		expect(stateWithSelectedRect().drag).toBeNull();
	});

	it("is 'move' for the length of an object drag", () => {
		let state = stateWithSelectedRect();
		state = handleGesture(
			state,
			dragGesture("dragStart", { targetKind: "object", targetId: "r1" }),
			registries,
		);
		expect(state.drag?.kind).toBe("move");

		state = handleGesture(
			state,
			dragGesture("dragEnd", { targetKind: "object", targetId: "r1" }),
			registries,
		);
		expect(state.drag).toBeNull();
	});

	it("carries the move preview for the length of an object drag and drops it with the drag", () => {
		let state = stateWithSelectedRect();
		const startObjects = state.objects;
		state = handleGesture(
			state,
			dragGesture("dragStart", { targetKind: "object", targetId: "r1" }),
			registries,
		);
		const { drag } = state;
		expect(drag?.kind === "move" && drag.movePreview).toEqual({
			delta: { x: 20, y: 20 },
			translatedIds: new Set(["r1"]),
			startObjects,
		});

		state = handleGesture(
			state,
			dragGesture("dragEnd", { targetKind: "object", targetId: "r1" }),
			registries,
		);
		expect(state.drag).toBeNull();
		expect(state.objects.r1).toMatchObject({ cx: 120, cy: 120 });
	});

	it("is 'transform' for a resize handle drag", () => {
		let state = stateWithSelectedRect();
		state = handleGesture(
			state,
			dragGesture("dragStart", {
				targetKind: "control",
				targetId: "transform",
				targetAction: "resize:bottomRight",
			}),
			registries,
		);
		expect(state.drag?.kind).toBe("transform");
		expect(state.drag).not.toHaveProperty("movePreview");
	});

	it("is 'marquee' for a left drag on the canvas, its rectangle with it", () => {
		let state = stateWithSelectedRect();
		state = handleGesture(
			state,
			dragGesture("dragStart", { targetKind: "canvas", targetId: "canvas" }),
			registries,
		);
		expect(state.drag).toMatchObject({
			kind: "marquee",
			rect: { startX: 100, startY: 100, endX: 120, endY: 120 },
			edgeScrollEnabled: true,
		});
	});

	it("is 'pan' for a middle-button drag, which scrolls no edge", () => {
		const state = handleGesture(
			stateWithSelectedRect(),
			{
				...dragGesture("dragStart", { targetKind: "object", targetId: "r1" }),
				button: 1,
			} as Gesture,
			registries,
		);
		expect(state.drag).toMatchObject({ kind: "pan", edgeScrollEnabled: false });
	});

	it("is 'menu' for a drag on a menu control", () => {
		const state = handleGesture(
			stateWithSelectedRect(),
			dragGesture("dragStart", {
				targetKind: "menu",
				targetId: "object-menu",
				targetAction: "slider:strokeWidth",
			}),
			registries,
		);
		expect(state.drag).toMatchObject({
			kind: "menu",
			edgeScrollEnabled: false,
		});
	});

	it("stays 'inert' for a drag no handler takes up", () => {
		const state = handleGesture(
			stateWithSelectedRect(),
			dragGesture("dragStart", { targetKind: "nothing-handles-this" }),
			registries,
		);
		expect(state.drag).toMatchObject({
			kind: "inert",
			snapFeedback: null,
			axisLockFeedback: null,
			edgeScrollEnabled: false,
		});
	});
});
