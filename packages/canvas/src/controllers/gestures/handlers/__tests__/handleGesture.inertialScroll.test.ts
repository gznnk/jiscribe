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
 * A fling frame as the recognizer emits it: canvas-targeted, no pointer, and
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

/** The recognizer's one-shot "the fling is over"; moves nothing. */
const inertialScrollEnd = (): Gesture =>
	({
		type: "inertialScrollEnd",
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

describe("handleGesture - the fling raises and lowers inertialScrolling", () => {
	it("raises it on a fling frame and keeps it up across frames", () => {
		const first = handleGesture(
			baseState(),
			inertialScroll(-40, 0),
			registries,
		);
		expect(first.inertialScrolling).toBe(true);

		const second = handleGesture(first, inertialScroll(-30, 0), registries);
		expect(second.inertialScrolling).toBe(true);
	});

	it("lowers it on the end gesture", () => {
		const flinging = handleGesture(
			baseState(),
			inertialScroll(-40, 0),
			registries,
		);
		const next = handleGesture(flinging, inertialScrollEnd(), registries);

		expect(next.inertialScrolling).toBe(false);
	});

	it("moves nothing on the end gesture, and leaves an idle state untouched", () => {
		const flinging = handleGesture(
			baseState(),
			inertialScroll(-40, 0),
			registries,
		);
		const ended = handleGesture(flinging, inertialScrollEnd(), registries);
		expect(ended.viewport).toEqual(flinging.viewport);

		// A stray end with no fling under way is not even a new state object.
		const idle = baseState();
		expect(handleGesture(idle, inertialScrollEnd(), registries)).toBe(idle);
	});
});
