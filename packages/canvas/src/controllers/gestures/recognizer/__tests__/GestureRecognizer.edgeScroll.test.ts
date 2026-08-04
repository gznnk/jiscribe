import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";

/**
 * Verification test for Issue #72.
 *
 * During edge scrolling, the recognizer adds the raw-pixel scrollDelta to `currentPos`
 * (= drag.last) and scrollDelta/zoom to `delta` (GestureRecognizer.ts:346-349).
 * This test faithfully reproduces the real one-frame loop and measures, each frame, how far
 * `event.last` deviates from "the world coordinate of the cursor as painted".
 *
 * The reproduced real loop:
 *   1. The recognizer gets the cursor's world coordinate reflecting the current viewport via
 *      getSvgPoint (= inverse getScreenCTM transform).
 *   2. Fire a drag (last / delta / scrollDelta).
 *   3. CanvasEventHandler does viewport.minX += scrollDelta/zoom via a scroll-derived event.
 *   4. The next frame's getSvgPoint reflects the updated viewport.
 *
 * sim.viewport is shared between the getSvgPoint mock and canvasStateRef, and after each frame
 * we perform the reducer-equivalent viewport update by hand to reproduce the above.
 */

const STEP = 10; // Equivalent to AUTO_SCROLL_STEP_SIZE (px)
const CLIENT_X = 790; // Client X of the cursor held at the edge (near the right edge, unchanged)
// Interior client X for arming (arm-on-leave). Grabbing here puts the start point outside the edge.
const CLIENT_X_INTERIOR = 400;

// Mutable viewport shared between the getSvgPoint mock and canvasStateRef.
const sim = vi.hoisted(() => ({
	viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 2 },
}));

vi.mock("../utils", () => ({
	// Inverse getScreenCTM transform when drawing viewBox = `minX minY width/zoom height/zoom`
	// onto screen size width x height: world = minX + clientX / zoom. The key point is that it reflects the viewport.
	getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
		x: sim.viewport.minX + clientX / sim.viewport.zoom,
		y: sim.viewport.minY + clientY / sim.viewport.zoom,
	}),
	getGestureTarget: () => ({ id: "obj-1", kind: "rect" }),
	createGetHovered: () => () => [],
	getInputValue: () => undefined,
	readInputValue: () => undefined,
	isGestureOptedOut: () => false,
	isNativePointerTarget: () => false,
	// Position-dependent proximity check. Within AUTO_SCROLL_THRESHOLD (=20px) of the right edge is near.
	// In the interior (toward the left), near=false, which reproduces arm-on-leave arming.
	detectEdgeProximity: (
		vp: { minX: number; width: number; zoom: number },
		svgX: number,
	) => {
		const rightWorld = vp.minX + vp.width / vp.zoom;
		const isNearEdge = rightWorld - svgX < 20 / vp.zoom;
		return {
			isNearEdge,
			horizontal: isNearEdge ? ("right" as const) : null,
			vertical: null,
		};
	},
	calculateScrollDelta: () => ({ deltaX: STEP, deltaY: 0 }),
}));

let rafCallbacks: FrameRequestCallback[] = [];

const flushRaf = (): void => {
	// Save first, then run. Enqueue/schedule during flush is pushed onto the new rafCallbacks as
	// the next frame's batch and is not run in this call (= 1 flush = 1 frame).
	const pending = rafCallbacks;
	rafCallbacks = [];
	for (const cb of pending) {
		cb(performance.now());
	}
};

beforeEach(() => {
	rafCallbacks = [];
	sim.viewport = { minX: 0, minY: 0, width: 800, height: 600, zoom: 2 };
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
		rafCallbacks.push(cb);
		return rafCallbacks.length;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
		rafCallbacks.splice(id - 1, 1);
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

type MockPointerEvent = {
	type: string;
	pointerId: number;
	clientX: number;
	clientY: number;
	shiftKey: boolean;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	target: EventTarget | null;
	timeStamp: number;
	button: number;
};

const makeEvent = (
	type: string,
	clientX: number,
	clientY: number,
	timeStamp: number,
): MockPointerEvent => ({
	type,
	pointerId: 1,
	clientX,
	clientY,
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	target: {} as EventTarget,
	timeStamp,
	button: 0,
});

const setup = () => {
	const events: Gesture[] = [];
	const config: GestureRecognizerConfig = {
		gestureCallback: (g) => events.push(g),
		containerRef: { current: null },
		svgRef: { current: null },
		canvasStateRef: {
			current: {
				edgeScrollEnabled: true,
				// Reference the same mutable viewport as getSvgPoint (share zoom / minX).
				viewport: sim.viewport,
			},
		},
	};
	const recognizer = new GestureRecognizer(config);
	const handlers = recognizer.getHandlers();
	const wheelHandler = recognizer.getWheelHandler();
	const dispatch = (e: MockPointerEvent): void => {
		switch (e.type) {
			case "pointerdown":
				handlers.onPointerDown(e as never);
				break;
			case "pointermove":
				handlers.onPointerMove(e as never);
				break;
			case "pointerup":
				handlers.onPointerUp(e as never);
				break;
		}
	};
	return { events, dispatch, wheelHandler };
};

type Sample = {
	/** drag.last.x emitted by the recognizer (the value the handler consumes as cursor position) */
	lastX: number;
	/** drag.delta.x emitted by the recognizer */
	deltaX: number;
	/** drag.start.x (world coordinate at drag start, unchanged) */
	startX: number;
	/** The world coordinate at which the cursor at fixed client coordinates is painted,
	 *  after the viewport has moved by scrollDelta/zoom as a result of this drag */
	cursorWorldWhenPainted: number;
};

/**
 * pointerdown -> start dragging to the edge -> hold at the edge and run edge scroll for N frames,
 * recording each frame's drag as the real loop (consume drag -> update viewport).
 */
const runEdgeScroll = (frames: number): Sample[] => {
	const { events, dispatch } = setup();
	const { zoom } = sim.viewport;

	// pressed (interior)
	dispatch(makeEvent("pointerdown", CLIENT_X_INTERIOR, 100, 0));
	flushRaf();

	// Start dragging (over threshold, interior). scrollDelta is not yet applied to dragStart.
	dispatch(makeEvent("pointermove", CLIENT_X_INTERIOR + 20, 100, 16));
	flushRaf();

	// One drag in the interior. Being outside the edge sets edgeScrollArmed (armed).
	dispatch(makeEvent("pointermove", CLIENT_X_INTERIOR + 40, 100, 24));
	flushRaf();

	// Hold at the edge and emit the first drag. From then on the enqueue self-runs, so
	// merely repeating flushRaf keeps edge scrolling going each frame.
	dispatch(makeEvent("pointermove", CLIENT_X, 100, 32));

	const samples: Sample[] = [];
	let seen = events.filter((e) => e.type === "drag").length;

	for (let i = 0; i < frames; i++) {
		flushRaf();
		const drags = events.filter((e) => e.type === "drag");
		const drag = drags[drags.length - 1];
		if (!drag || drags.length === seen) {
			break;
		}
		seen = drags.length;

		const scrollDeltaX = drag.scrollDelta?.deltaX ?? 0;
		// reducer-equivalent: move the viewport by scrollDelta/zoom (CanvasEventHandler.ts:65).
		sim.viewport.minX += scrollDeltaX / zoom;

		samples.push({
			lastX: drag.last.x,
			deltaX: drag.delta.x,
			startX: drag.start.x,
			cursorWorldWhenPainted: sim.viewport.minX + CLIENT_X / zoom,
		});
	}

	return samples;
};

/**
 * pointerdown -> start dragging -> hold at the edge and run "wheel scrolling during a drag" for
 * N frames (isWheel branch: GestureRecognizer.ts:312-322).
 * The wheel path does not self-run via enqueue, so emit one wheel per frame.
 */
const runWheelScroll = (frames: number): Sample[] => {
	const { events, dispatch, wheelHandler } = setup();
	const { zoom } = sim.viewport;

	dispatch(makeEvent("pointerdown", 200, 100, 0));
	flushRaf();
	// Start dragging (dragging=true). toWheelEvent turns into a pointermove only while dragging.
	dispatch(makeEvent("pointermove", CLIENT_X, 100, 16));
	flushRaf();

	const samples: Sample[] = [];
	let seen = events.filter((e) => e.type === "drag").length;
	let t = 32;

	for (let i = 0; i < frames; i++) {
		// Spin the wheel over the cursor held at the edge (deltaX = STEP).
		wheelHandler({
			clientX: CLIENT_X,
			clientY: 100,
			deltaX: STEP,
			deltaY: 0,
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			target: {} as EventTarget,
			timeStamp: t,
		} as never);
		t += 16;
		flushRaf();

		const drags = events.filter((e) => e.type === "drag");
		const drag = drags[drags.length - 1];
		if (!drag || drags.length === seen) {
			break;
		}
		seen = drags.length;

		const scrollDeltaX = drag.scrollDelta?.deltaX ?? 0;
		sim.viewport.minX += scrollDeltaX / zoom;

		samples.push({
			lastX: drag.last.x,
			deltaX: drag.delta.x,
			startX: drag.start.x,
			cursorWorldWhenPainted: sim.viewport.minX + CLIENT_X / zoom,
		});
	}

	return samples;
};

describe("GestureRecognizer drag.last during scroll (#72 regression / common to edge and wheel)", () => {
	// Before the fix: raw-pixel scrollDelta was added to currentPos, so last led the cursor paint
	// position by a constant s - s/zoom (at zoom 2, 5 world units = 10px).
	// Transform/Vertex/range selection use last directly as the cursor position, so this lead
	// showed up as an on-screen offset (#72). After the fix, last aligns to /zoom and becomes 0.
	it("zoom != 1: last matches the cursor paint position (no leading offset)", () => {
		const samples = runEdgeScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);

		for (const s of samples) {
			expect(s.lastX - s.cursorWorldWhenPainted).toBeCloseTo(0);
		}
	});

	it("last's per-frame growth is s/zoom (= actual viewport movement), not zoom-times faster", () => {
		const samples = runEdgeScroll(6);
		const zoom = 2;

		for (let i = 1; i < samples.length; i++) {
			const growth = samples[i].lastX - samples[i - 1].lastX;
			// Advances by STEP/zoom, not the "zoom-times faster (= STEP)" claimed in the issue.
			expect(growth).toBeCloseTo(STEP / zoom);
			expect(growth).not.toBeCloseTo(STEP);
		}
	});

	it("the invariant last === start + delta is preserved", () => {
		const samples = runEdgeScroll(6);

		for (const s of samples) {
			expect(s.lastX - (s.startX + s.deltaX)).toBeCloseTo(0);
		}
	});

	it("zoom=1: the offset is 0 and the invariant is preserved", () => {
		sim.viewport.zoom = 1;
		const samples = runEdgeScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);

		for (const s of samples) {
			expect(s.lastX - s.cursorWorldWhenPainted).toBeCloseTo(0);
			expect(s.lastX - (s.startX + s.deltaX)).toBeCloseTo(0);
		}
	});

	// The block at 344-350 is the common merge point of the isWheel branch (wheel during a drag)
	// and edge scroll. Confirm there is no leading offset on the wheel path either.
	it("wheel during a drag behaves identically to edge scroll: last matches the cursor", () => {
		const samples = runWheelScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);

		const zoom = 2;

		for (const s of samples) {
			expect(s.lastX - s.cursorWorldWhenPainted).toBeCloseTo(0);
			expect(s.lastX - (s.startX + s.deltaX)).toBeCloseTo(0);
		}

		// Per-frame growth is s/zoom (not zoom-times faster).
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i].lastX - samples[i - 1].lastX).toBeCloseTo(STEP / zoom);
		}
	});
});

describe("GestureRecognizer arm-on-leave (preventing runaway right after grabbing from edge-adjacent UI)", () => {
	// Grabbing from edge-adjacent UI such as StencilLibrary always places the start point inside the
	// edge zone. Do not trigger scrolling until the pointer has left the edge zone at least once.
	it("does not scroll even while moving inside the edge zone from the start", () => {
		const { events, dispatch } = setup();

		// Grab at the edge (clientX=800) and move while staying inside the edge zone (clientX>780).
		// The drag threshold is exceeded but the pointer never leaves the zone.
		dispatch(makeEvent("pointerdown", 800, 100, 0));
		flushRaf();
		dispatch(makeEvent("pointermove", 786, 100, 16)); // dragStart (still at the edge)
		flushRaf();
		dispatch(makeEvent("pointermove", 795, 100, 32)); // drag (still at the edge)
		flushRaf();
		// If it self-ran, additional frames would keep scrolling, but since it is not armed, nothing happens.
		flushRaf();
		flushRaf();

		const drags = events.filter((e) => e.type === "drag");
		expect(drags.length).toBeGreaterThan(0);
		for (const drag of drags) {
			expect(drag.scrollDelta).toBeUndefined();
		}
	});

	// Once the pointer leaves the edge it is armed, and scrolling starts when it later touches the edge.
	it("scrolling starts after leaving to the interior and returning to the edge", () => {
		// runEdgeScroll follows a path that inserts one interior drag before moving to the edge.
		const samples = runEdgeScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);
		expect(samples[0].deltaX).not.toBe(0);
	});
});
