import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import { describe, expect, it } from "vitest";

import { canvasToState } from "../../../../states/canvas/CanvasMapper";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type {
	CanvasControllerState,
	ScrollBoundsConfig,
} from "../../../CanvasTypes";
import { createCanvasReducer } from "../../../reducer/canvasReducer";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

const registries = createTestRegistries();

// padding 0 puts the wall on the content edge, so the expected numbers are the
// doc's extent itself: rect-1 (0,0)-(10,10) and rect-2 (100,100)-(110,110).
const scrollBoundsConfig = { mode: "content", padding: 0 } as const;

/** A doc of two rects spanning (0,0)-(110,110), optionally declaring a `view`. */
const twoRectsDocWith = (view?: ViewDoc): CanvasDoc =>
	({
		version: 1,
		...(view !== undefined ? { view } : {}),
		root: [
			{ id: "rect-1", type: "rect", x: 0, y: 0, width: 10, height: 10 },
			{ id: "rect-2", type: "rect", x: 100, y: 100, width: 10, height: 10 },
		],
	}) as unknown as CanvasDoc;

const twoRectsDoc = twoRectsDocWith();

/**
 * State over twoRectsDoc with the camera placed by hand.
 *
 * @param zoom - 10 makes the view (1000 x 800 px) 100 x 80 world units, i.e.
 *   narrower than the content, which is the case with a wall on either side
 * @param limited - false builds the default infinite canvas
 */
const createState = (
	minX: number,
	minY: number,
	zoom: number,
	limited = true,
): CanvasControllerState =>
	createStateFrom(
		twoRectsDoc,
		limited ? scrollBoundsConfig : undefined,
		minX,
		minY,
		zoom,
	);

/** {@link createState} with the doc and the host setting spelled out. */
const createStateFrom = (
	doc: CanvasDoc,
	hostConfig: ScrollBoundsConfig | undefined,
	minX: number,
	minY: number,
	zoom: number,
): CanvasControllerState => {
	const state = createInitialControllerState(
		doc,
		registries,
		undefined,
		hostConfig,
	);
	return deepFreezeState({
		...state,
		viewport: { ...state.viewport, minX, minY, zoom },
	});
};

const baseGesture = {
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
};

/** A wheel scroll of `deltaX` / `deltaY` screen px over the canvas background. */
const wheel = (deltaX: number, deltaY: number): Gesture =>
	({
		...baseGesture,
		type: "wheel",
		scrollDelta: { deltaX, deltaY },
	}) as unknown as Gesture;

/** A right-button grab pan; the content follows the pointer, so minX moves the other way. */
const grabPan = (clientDeltaX: number): Gesture =>
	({
		...baseGesture,
		type: "drag",
		button: 2,
		clientLast: { x: clientDeltaX, y: 0 },
		clientDelta: { x: clientDeltaX, y: 0 },
	}) as unknown as Gesture;

/**
 * A drag of rect-2 by `delta` world units. `scrollDelta` (screen px) is the
 * scroll the drag carries: the wheel turned mid-drag, or the auto-scroll of a
 * drag held at the container edge.
 */
const dragRect2 = (
	type: "dragStart" | "drag" | "dragEnd",
	delta: { x: number; y: number },
	scrollDelta?: { deltaX: number; deltaY: number },
): Gesture =>
	({
		...baseGesture,
		type,
		scrollDelta,
		targetKind: "object",
		targetId: "rect-2",
		start: { x: 105, y: 105 },
		last: { x: 105 + delta.x, y: 105 + delta.y },
		delta,
		clientStart: { x: 105, y: 105 },
		clientLast: { x: 105 + delta.x, y: 105 + delta.y },
		clientDelta: delta,
	}) as unknown as Gesture;

const apply = (
	state: CanvasControllerState,
	...gestures: Gesture[]
): CanvasControllerState =>
	gestures.reduce(
		(current, gesture) => handleGesture(current, gesture, registries),
		state,
	);

describe("handleGesture - scroll limit", () => {
	it("stops a wheel scroll at the far edge of the range", () => {
		// zoom 10: the view is 100 x 80 world units, so minX may run 0..10.
		const next = apply(createState(5, 5, 10), wheel(500, 0));

		expect(next.viewport.minX).toBe(10);
	});

	it("stops a wheel scroll at the near edge of the range", () => {
		const next = apply(createState(5, 5, 10), wheel(-500, -500));

		expect(next.viewport.minX).toBe(0);
		expect(next.viewport.minY).toBe(0);
	});

	it("lets a content smaller than the view rest against either edge", () => {
		// zoom 1: the view is 1000 x 800 world units against 110 of content, so
		// minX may run from -890 ("content flush right") to 0 ("flush left").
		const state = createState(-400, 0, 1);

		expect(apply(state, wheel(200, 0)).viewport.minX).toBe(-200);
		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(0);
		expect(apply(state, wheel(-9999, 0)).viewport.minX).toBe(-890);
	});

	it("stops the grab pan of a right-button drag", () => {
		// 500 px of leftward drag at zoom 10 is 50 world units, past the wall at 10.
		const next = apply(createState(5, 5, 10), grabPan(-500));

		expect(next.viewport.minX).toBe(10);
	});

	it("does not limit a Ctrl+wheel zoom, wherever it leaves the view", () => {
		// A camera the host jumped far outside the range; only a scroll pulls it back.
		const outside = createState(900, 900, 5);

		const zoomed = apply(outside, {
			...wheel(0, -100),
			mods: { shift: false, alt: false, ctrl: true, meta: false },
		} as unknown as Gesture);

		expect(zoomed.viewport.zoom).toBeCloseTo(5.5);
		// The zoom moved the camera on its own terms and left it out there: the
		// content it would be walled in to ends at 110.
		expect(zoomed.viewport.minX).toBeGreaterThan(110);
	});

	it("leaves the scroll a drag carries alone, and does not take it back at dragEnd", () => {
		const state = createState(5, 5, 10);

		// 500 px at zoom 10 is 50 world units — far past the wall at 10.
		const scrolled = apply(
			state,
			dragRect2("dragStart", { x: 0, y: 0 }),
			dragRect2("drag", { x: 0, y: 0 }, { deltaX: 500, deltaY: 0 }),
		);
		expect(scrolled.viewport.minX).toBe(55);

		const dragEnded = apply(scrolled, dragRect2("dragEnd", { x: 0, y: 0 }));
		expect(dragEnded.viewport.minX).toBe(55);
	});

	it("does not jump the view back when a scroll starts outside the range", () => {
		// A drag has left the view at 55, well past the wall at 10.
		const outside = apply(
			createState(5, 5, 10),
			dragRect2("dragStart", { x: 0, y: 0 }),
			dragRect2("drag", { x: 0, y: 0 }, { deltaX: 500, deltaY: 0 }),
			dragRect2("dragEnd", { x: 0, y: 0 }),
		);

		// Scrolling further out is all that is refused; the view stays put.
		expect(apply(outside, wheel(100, 0)).viewport.minX).toBe(55);

		// Scrolling back toward the content works, one wheel turn at a time…
		const returning = apply(outside, wheel(-100, 0));
		expect(returning.viewport.minX).toBe(45);

		// …and the wall is back in force once the view is inside it again.
		expect(apply(returning, wheel(-9999, 0)).viewport.minX).toBe(0);
	});

	it("re-measures the range against the objects as they stand at the scroll", () => {
		const state = createState(5, 5, 10);

		// Dragging rect-2 200 units right extends the content, and with it the wall.
		const moved = apply(
			state,
			dragRect2("dragStart", { x: 0, y: 0 }),
			dragRect2("drag", { x: 200, y: 0 }),
			dragRect2("dragEnd", { x: 200, y: 0 }),
		);

		expect(apply(moved, wheel(9999, 0)).viewport.minX).toBe(210);
	});

	it("measures the range once and reuses it while the objects stay put", () => {
		const scrolled = apply(createState(5, 5, 10), wheel(10, 0));
		const measured = scrolled.scrollLimit;

		const again = apply(scrolled, wheel(10, 0));

		expect(again.scrollLimit).toBe(measured);
		expect(measured.rect).toEqual({
			left: 0,
			top: 0,
			right: 110,
			bottom: 110,
		});
	});

	it("leaves the view alone on an unbounded canvas", () => {
		const next = apply(createState(5, 5, 10, false), wheel(9999, 9999));

		// Nothing walls the view in, so nothing was ever measured either.
		expect(next.scrollLimit.rect).toBeNull();
		expect(next.scrollLimit.measuredFrom).toBeNull();
		expect(next.viewport.minX).toBe(1004.9);
	});
});

describe("handleGesture - scroll limit declared by the document", () => {
	// Content (0,0)-(110,110) with these sides makes the wall (-64,-32)-(174,134).
	const pagePadding = { top: 32, right: 64, bottom: 24, left: 64 };

	it("walls the view in at the content grown by view.padding", () => {
		const state = createStateFrom(
			twoRectsDocWith({ padding: pagePadding, scroll: "content" }),
			undefined,
			0,
			0,
			10,
		);

		// zoom 10: the view is 100 x 80 world units, so minX may run -64..74.
		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(74);
		expect(apply(state, wheel(-9999, 0)).viewport.minX).toBe(-64);
		expect(apply(state, wheel(0, -9999)).viewport.minY).toBe(-32);
	});

	it("puts the wall flush on the content when the document declares no padding", () => {
		const state = createStateFrom(
			twoRectsDocWith({ scroll: "content" }),
			undefined,
			0,
			0,
			10,
		);

		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(10);
	});

	it("leaves the view alone when the document declares infinite", () => {
		const state = createStateFrom(
			twoRectsDocWith({ padding: pagePadding, scroll: "infinite" }),
			undefined,
			0,
			0,
			10,
		);

		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(999.9);
	});

	it("leaves the view alone when the document declares no scroll at all", () => {
		const state = createStateFrom(
			twoRectsDocWith({ padding: pagePadding, open: "fit-width" }),
			undefined,
			0,
			0,
			10,
		);

		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(999.9);
	});

	it("is outranked by a host that asks for no wall", () => {
		const state = createStateFrom(
			twoRectsDocWith({ padding: pagePadding, scroll: "content" }),
			{ mode: "infinite" },
			0,
			0,
			10,
		);

		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(999.9);
	});

	it("is outranked by a host that asks for its own wall, view.padding included", () => {
		const state = createStateFrom(
			twoRectsDocWith({ padding: pagePadding, scroll: "content" }),
			// padding 0 on every side, where the doc asks for 64 on the left.
			{ mode: "content", padding: 0 },
			0,
			0,
			10,
		);

		expect(apply(state, wheel(-9999, 0)).viewport.minX).toBe(0);
		expect(apply(state, wheel(9999, 0)).viewport.minX).toBe(10);
	});

	it("moves the wall with the document when another one is loaded", () => {
		const reducer = createCanvasReducer(registries);
		const walled = apply(
			createStateFrom(
				twoRectsDocWith({ padding: pagePadding, scroll: "content" }),
				undefined,
				0,
				0,
				10,
			),
			wheel(9999, 0),
		);
		expect(walled.viewport.minX).toBe(74);

		const unwalled = reducer(walled, {
			type: "SYNC_EXTERNAL",
			payload: canvasToState(
				twoRectsDocWith({ padding: pagePadding }),
				registries.objectMapper,
				registries.objectContentResizer,
			),
		});

		expect(apply(unwalled, wheel(9999, 0)).viewport.minX).toBe(1073.9);
	});
});
