import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
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

const baseState = (zoom = 1): CanvasControllerState => {
	const state = createInitialControllerState(emptyDoc, registries);
	return deepFreezeState({
		...state,
		viewport: { ...state.viewport, minX: 0, minY: 0, zoom },
	});
};

/**
 * A glide frame as the recognizer emits it: canvas-targeted, no pointer, and
 * carrying only the screen-px distance covered since the previous frame.
 */
const inertialScroll = (deltaX: number, deltaY: number): Gesture =>
	({
		type: "inertialScroll",
		button: 0,
		targetKind: "canvas",
		targetId: "canvas",
		start: { x: 0, y: 0 },
		last: { x: 0, y: 0 },
		delta: { x: 0, y: 0 },
		clientStart: { x: 0, y: 0 },
		clientLast: { x: 0, y: 0 },
		clientDelta: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
		scrollDelta: { deltaX, deltaY },
	}) as unknown as Gesture;

describe("handleGesture - inertialScroll moves the view like a wheel scroll", () => {
	it("moves the viewport origin by the scroll delta", () => {
		const next = handleGesture(
			baseState(),
			inertialScroll(-40, 20),
			registries,
		);

		expect(next.viewport.minX).toBe(-40);
		expect(next.viewport.minY).toBe(20);
		expect(next.viewport.zoom).toBe(1);
	});

	it("divides the screen-px delta by the zoom", () => {
		const next = handleGesture(
			baseState(2),
			inertialScroll(-40, 20),
			registries,
		);

		expect(next.viewport.minX).toBe(-20);
		expect(next.viewport.minY).toBe(10);
	});

	it("opens no drag lifecycle and commits nothing", () => {
		const state = baseState();
		const next = handleGesture(state, inertialScroll(-40, 0), registries);

		expect(next.eventStartSnapshot).toBeNull();
		expect(next.activeDragKind).toBeNull();
		expect(next.areaSelection).toBeNull();
		expect(next.commitVersion).toBe(state.commitVersion);
	});
});
