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
 * A pinch gesture as fired by GestureRecognizer: zoomScale is the finger-distance
 * ratio, scrollDelta the negated midpoint movement, last the midpoint (zoom anchor)
 * in world coordinates.
 */
const pinch = (
	zoomScale: number,
	scrollDelta: { deltaX: number; deltaY: number },
	last: { x: number; y: number },
): Gesture =>
	({
		type: "pinch",
		button: 0,
		targetKind: "canvas",
		targetId: "canvas",
		last,
		clientLast: last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
		zoomScale,
		scrollDelta,
	}) as unknown as Gesture;

describe("handleGesture - pinch decomposes into zoom + scroll", () => {
	it("applies the continuous zoom factor to the viewport", () => {
		const state = baseState();
		const nextState = handleGesture(
			state,
			pinch(2, { deltaX: 0, deltaY: 0 }, { x: 0, y: 0 }),
			registries,
		);
		expect(nextState.viewport.zoom).toBe(state.viewport.zoom * 2);
	});

	it("anchors the zoom at the midpoint: the world point under it keeps its screen position", () => {
		const state = baseState();
		const anchor = { x: 100, y: 50 };
		const nextState = handleGesture(
			state,
			pinch(2, { deltaX: 0, deltaY: 0 }, anchor),
			registries,
		);

		// screen position = (world - min) * zoom, for both axes
		const before = state.viewport;
		const after = nextState.viewport;
		expect((anchor.x - after.minX) * after.zoom).toBeCloseTo(
			(anchor.x - before.minX) * before.zoom,
		);
		expect((anchor.y - after.minY) * after.zoom).toBeCloseTo(
			(anchor.y - before.minY) * before.zoom,
		);
	});

	it("applies the pan at the post-zoom scale (zoom first, then scroll)", () => {
		const state = baseState();
		const nextState = handleGesture(
			state,
			pinch(2, { deltaX: -100, deltaY: -60 }, { x: 0, y: 0 }),
			registries,
		);

		// The zoom-only viewport is the baseline the pan applies to
		const zoomedOnly = handleGesture(
			state,
			pinch(2, { deltaX: 0, deltaY: 0 }, { x: 0, y: 0 }),
			registries,
		).viewport;
		expect(nextState.viewport.minX).toBeCloseTo(
			zoomedOnly.minX - 100 / zoomedOnly.zoom,
		);
		expect(nextState.viewport.minY).toBeCloseTo(
			zoomedOnly.minY - 60 / zoomedOnly.zoom,
		);
	});

	it("a pure pan (zoomScale 1) moves the viewport without changing zoom", () => {
		const state = baseState();
		const nextState = handleGesture(
			state,
			pinch(1, { deltaX: 50, deltaY: -30 }, { x: 0, y: 0 }),
			registries,
		);
		expect(nextState.viewport.zoom).toBe(state.viewport.zoom);
		expect(nextState.viewport.minX).toBeCloseTo(
			state.viewport.minX + 50 / state.viewport.zoom,
		);
		expect(nextState.viewport.minY).toBeCloseTo(
			state.viewport.minY - 30 / state.viewport.zoom,
		);
	});

	it("does not touch the doc or record history (no commit)", () => {
		const state = baseState();
		const nextState = handleGesture(
			state,
			pinch(2, { deltaX: -100, deltaY: 0 }, { x: 0, y: 0 }),
			registries,
		);
		expect(nextState.objects).toBe(state.objects);
		expect(nextState.rootIds).toBe(state.rootIds);
		expect(nextState.commitVersion).toBe(state.commitVersion);
	});
});
