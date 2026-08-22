import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

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

const baseState = (): CanvasControllerState =>
	deepFreezeState(createInitialControllerState(emptyDoc, registries));

/**
 * A left-button canvas-background drag gesture. pointerType undefined = mouse
 * (the recognizer sets it only from real pointer events; wheel-synthesized moves
 * have none), "touch" = the one-finger pan case under test.
 */
const canvasDrag = (
	type: "dragStart" | "drag" | "dragEnd",
	clientDelta: { x: number; y: number },
	pointerType?: string,
): Gesture =>
	({
		type,
		button: 0,
		pointerType,
		targetKind: "canvas",
		targetId: "canvas",
		start: { x: 100, y: 100 },
		last: { x: 100 + clientDelta.x, y: 100 + clientDelta.y },
		clientStart: { x: 100, y: 100 },
		clientLast: { x: 100 + clientDelta.x, y: 100 + clientDelta.y },
		clientDelta,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

describe("handleGesture - a touch canvas drag pans instead of area-selecting", () => {
	it("pans the viewport by clientDelta and never creates an areaSelection", () => {
		const state0 = baseState();
		const state1 = handleGesture(
			state0,
			canvasDrag("dragStart", { x: 4, y: 0 }, "touch"),
			registries,
		);
		expect(state1.areaSelection).toBeNull();

		const state2 = handleGesture(
			state1,
			canvasDrag("drag", { x: 100, y: 50 }, "touch"),
			registries,
		);
		expect(state2.areaSelection).toBeNull();
		// Content follows the finger: minX/minY move opposite to the drag
		expect(state2.viewport.minX).toBeCloseTo(
			state0.viewport.minX - 100 / state0.viewport.zoom,
		);
		expect(state2.viewport.minY).toBeCloseTo(
			state0.viewport.minY - 50 / state0.viewport.zoom,
		);
	});

	it("dragEnd closes the pan without committing (no doc change, no history)", () => {
		const state0 = baseState();
		const state1 = handleGesture(
			state0,
			canvasDrag("dragStart", { x: 4, y: 0 }, "touch"),
			registries,
		);
		const state2 = handleGesture(
			state1,
			canvasDrag("drag", { x: 100, y: 0 }, "touch"),
			registries,
		);
		const state3 = handleGesture(
			state2,
			canvasDrag("dragEnd", { x: 100, y: 0 }, "touch"),
			registries,
		);

		expect(state3.eventStartSnapshot).toBeNull();
		expect(state3.commitVersion).toBe(state0.commitVersion);
		expect(state3.objects).toEqual(state0.objects);
	});

	it("a mouse canvas drag still starts an area selection (unchanged)", () => {
		const state1 = handleGesture(
			baseState(),
			canvasDrag("dragStart", { x: 4, y: 0 }),
			registries,
		);
		expect(state1.areaSelection).not.toBeNull();
		expect(state1.viewport).toEqual(baseState().viewport);
	});
});
