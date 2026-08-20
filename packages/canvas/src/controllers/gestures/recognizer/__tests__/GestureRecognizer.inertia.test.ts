import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import {
	FLING_RELEASE_IDLE_MS,
	FLING_VELOCITY_WINDOW_MS,
} from "../GestureRecognizerConstants";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

/**
 * Inertial scrolling: a released pan drag keeps emitting inertialScroll gestures
 * until the speed it was let go at decays away.
 *
 * The real velocity estimator runs (only the DOM-dependent utilities are stubbed),
 * so these tests pin the whole path from raw pointer samples to per-frame
 * scrollDelta — including the two ways a fast release still must not fling
 * (below the speed threshold, and released after coming to rest).
 *
 * Frame timestamps are supplied by hand: the recognizer integrates the fling
 * against them, so controlling them is what makes the emitted distances exact.
 */

vi.mock("../utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getWorldPoint: (
			_svg: unknown,
			_viewport: unknown,
			clientX: number,
			clientY: number,
		) => ({
			x: clientX,
			y: clientY,
		}),
		getGestureTarget: () => ({ id: "canvas", kind: "canvas" }),
		createGetHovered: () => () => [],
		getInputValue: () => undefined,
		readInputValue: () => undefined,
		isGestureOptedOut: () => false,
		isNativePointerTarget: () => false,
		detectEdgeProximity: () => ({ isNearEdge: false }),
		calculateScrollDelta: () => ({ deltaX: 0, deltaY: 0 }),
	};
});

let rafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;

/** Run every frame booked so far at `time`; frames booked during the run wait for the next call. */
const flushRaf = (time: number): void => {
	const pending = [...rafCallbacks];
	for (const [id] of pending) {
		rafCallbacks.delete(id);
	}
	for (const [, cb] of pending) {
		cb(time);
	}
};

beforeEach(() => {
	rafCallbacks = new Map();
	nextRafId = 1;
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
		const id = nextRafId++;
		rafCallbacks.set(id, cb);
		return id;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
		rafCallbacks.delete(id);
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const RIGHT_BUTTON = 2;
const LEFT_BUTTON = 0;

type MockPointerEvent = {
	type: string;
	pointerId: number;
	pointerType: string;
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
	timeStamp: number,
	button: number,
): MockPointerEvent => ({
	type,
	pointerId: 1,
	pointerType: "mouse",
	clientX,
	clientY: 300,
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	target: {} as EventTarget,
	timeStamp,
	button,
});

const setup = () => {
	const events: Gesture[] = [];
	const config: GestureRecognizerConfig = {
		gestureCallback: (g) => events.push(g),
		containerRef: { current: null },
		svgRef: { current: null },
		canvasStateRef: {
			current: {
				edgeScrollEnabled: false,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
		},
		// Mirrors the policy the canvas injects: the recognizer's contract is "ask
		// the policy", not "know which buttons pan".
		shouldFlingFromDrag: (button) => button === 1 || button === 2,
	};
	const recognizer = new GestureRecognizer(config);
	const handlers = recognizer.getHandlers();
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
	const flings = (): Gesture[] =>
		events.filter((e) => e.type === "inertialScroll");
	const ends = (): Gesture[] =>
		events.filter((e) => e.type === "inertialScrollEnd");
	return {
		events,
		flings,
		ends,
		dispatch,
		wheelHandler: recognizer.getWheelHandler(),
		cancelPendingGesture: () => recognizer.cancelPendingGesture(),
	};
};

const FRAME_MS = 16;

/**
 * Drag rightwards by `stepPx` per frame for three frames, then release.
 * The default covers 40px per 16ms frame = 2.5 px/ms, a firm flick.
 *
 * @param idleBeforeRelease - Milliseconds spent motionless between the last move
 *   and the pointerup (0 = released while still moving).
 */
const flickAndRelease = (
	harness: ReturnType<typeof setup>,
	{ stepPx = 40, button = RIGHT_BUTTON, idleBeforeRelease = 0 } = {},
): { releaseTime: number; velocity: number } => {
	const { dispatch } = harness;
	dispatch(makeEvent("pointerdown", 400, 0, button));
	flushRaf(0);

	let time = 0;
	for (let step = 1; step <= 3; step++) {
		time = step * FRAME_MS;
		dispatch(makeEvent("pointermove", 400 + step * stepPx, time, button));
		flushRaf(time);
	}

	const releaseTime = time + idleBeforeRelease;
	dispatch(makeEvent("pointerup", 400 + 3 * stepPx, releaseTime, button));
	flushRaf(releaseTime);

	return { releaseTime, velocity: (3 * stepPx) / time };
};

describe("GestureRecognizer - inertial scrolling after a released pan", () => {
	it("keeps scrolling in the drag direction, by the velocity times the frame length", () => {
		const harness = setup();
		const { releaseTime, velocity } = flickAndRelease(harness);

		expect(harness.flings()).toHaveLength(0);

		flushRaf(releaseTime + FRAME_MS);

		const [fling] = harness.flings();
		expect(fling).toBeDefined();
		// Dragging right moves the viewport left, exactly as a wheel scroll would.
		expect(fling.scrollDelta?.deltaX).toBeCloseTo(-velocity * FRAME_MS, 6);
		expect(fling.scrollDelta?.deltaY).toBeCloseTo(0, 6);
	});

	it("fires as a canvas-level gesture carrying no pointer and no modifiers", () => {
		const harness = setup();
		const { releaseTime } = flickAndRelease(harness);
		flushRaf(releaseTime + FRAME_MS);

		const [fling] = harness.flings();
		expect(fling.targetKind).toBe("canvas");
		expect(fling.targetId).toBe("canvas");
		expect(fling.button).toBe(0);
		expect(fling.mods).toEqual({
			shift: false,
			alt: false,
			ctrl: false,
			meta: false,
		});
		expect(fling.clientDelta).toEqual({ x: 0, y: 0 });
	});

	it("decelerates every frame and comes to a stop on its own", () => {
		const harness = setup();
		const { releaseTime } = flickAndRelease(harness);

		let time = releaseTime;
		// Far more frames than the fling needs; it must stop booking them well before.
		for (let frame = 0; frame < 400; frame++) {
			time += FRAME_MS;
			flushRaf(time);
		}

		const deltas = harness.flings().map((g) => g.scrollDelta?.deltaX ?? 0);
		expect(deltas.length).toBeGreaterThan(1);
		for (let i = 1; i < deltas.length; i++) {
			expect(Math.abs(deltas[i])).toBeLessThan(Math.abs(deltas[i - 1]));
		}

		// No frame is left booked once it has come to rest.
		const settled = harness.flings().length;
		time += FRAME_MS;
		flushRaf(time);
		expect(harness.flings()).toHaveLength(settled);
	});

	it("announces the end once, after the final frame and carrying no movement", () => {
		const harness = setup();
		const { releaseTime } = flickAndRelease(harness);

		let time = releaseTime;
		for (let frame = 0; frame < 400; frame++) {
			time += FRAME_MS;
			flushRaf(time);
		}

		expect(harness.ends()).toHaveLength(1);
		expect(harness.ends()[0].scrollDelta).toBeUndefined();
		// It is the last thing the fling says: no frame follows it.
		const types = harness.events.map((e) => e.type);
		expect(types[types.length - 1]).toBe("inertialScrollEnd");
	});

	it("does not fling when the release was too slow", () => {
		const harness = setup();
		// 6px over 48ms = 0.125 px/ms, under FLING_MIN_SPEED but past the drag threshold.
		const { releaseTime } = flickAndRelease(harness, { stepPx: 2 });

		flushRaf(releaseTime + FRAME_MS);
		expect(harness.flings()).toHaveLength(0);
		expect(harness.ends()).toHaveLength(0);
	});

	it("does not fling when the pointer came to rest before lifting", () => {
		const harness = setup();
		const { releaseTime } = flickAndRelease(harness, {
			idleBeforeRelease: FLING_RELEASE_IDLE_MS + 1,
		});

		flushRaf(releaseTime + FRAME_MS);
		expect(harness.flings()).toHaveLength(0);
		expect(harness.ends()).toHaveLength(0);
	});

	it("does not fling for a drag the policy rejects", () => {
		const harness = setup();
		const { releaseTime } = flickAndRelease(harness, { button: LEFT_BUTTON });

		flushRaf(releaseTime + FRAME_MS);
		expect(harness.flings()).toHaveLength(0);
		expect(harness.ends()).toHaveLength(0);
	});

	it("measures only the final motion, so a flick after a pause still flings", () => {
		const harness = setup();
		const { dispatch } = harness;
		dispatch(makeEvent("pointerdown", 400, 0, RIGHT_BUTTON));
		flushRaf(0);
		dispatch(makeEvent("pointermove", 440, FRAME_MS, RIGHT_BUTTON));
		flushRaf(FRAME_MS);

		// Hold still past the sample window, then flick: the stale samples are gone.
		const pauseEnd = FRAME_MS + FLING_VELOCITY_WINDOW_MS + FRAME_MS;
		dispatch(makeEvent("pointermove", 440, pauseEnd, RIGHT_BUTTON));
		flushRaf(pauseEnd);
		const flickEnd = pauseEnd + 2 * FRAME_MS;
		dispatch(makeEvent("pointermove", 520, flickEnd, RIGHT_BUTTON));
		flushRaf(flickEnd);

		dispatch(makeEvent("pointerup", 520, flickEnd, RIGHT_BUTTON));
		flushRaf(flickEnd);
		flushRaf(flickEnd + FRAME_MS);

		const [fling] = harness.flings();
		expect(fling).toBeDefined();
		// 80px over the 32ms since the pause ended, not over the whole press.
		expect(fling.scrollDelta?.deltaX).toBeCloseTo(
			(-80 / (2 * FRAME_MS)) * FRAME_MS,
			6,
		);
	});

	describe("a fling yields to fresh input", () => {
		const startFling = () => {
			const harness = setup();
			const { releaseTime } = flickAndRelease(harness);
			flushRaf(releaseTime + FRAME_MS);
			expect(harness.flings()).toHaveLength(1);
			return { harness, time: releaseTime + FRAME_MS };
		};

		it("stops on a new press", () => {
			const { harness, time } = startFling();
			harness.dispatch(makeEvent("pointerdown", 400, time + 1, RIGHT_BUTTON));

			flushRaf(time + FRAME_MS);
			flushRaf(time + 2 * FRAME_MS);
			expect(harness.flings()).toHaveLength(1);
			expect(harness.ends()).toHaveLength(1);
		});

		it("stops on a wheel", () => {
			const { harness, time } = startFling();
			harness.wheelHandler({
				clientX: 400,
				clientY: 300,
				deltaX: 0,
				deltaY: 100,
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				target: {} as EventTarget,
				timeStamp: time + 1,
			} as never);

			flushRaf(time + FRAME_MS);
			flushRaf(time + 2 * FRAME_MS);
			expect(harness.flings()).toHaveLength(1);
			expect(harness.ends()).toHaveLength(1);
		});

		it("stops on cancelPendingGesture (external sync / unmount)", () => {
			const { harness, time } = startFling();
			harness.cancelPendingGesture();

			flushRaf(time + FRAME_MS);
			flushRaf(time + 2 * FRAME_MS);
			expect(harness.flings()).toHaveLength(1);
			expect(harness.ends()).toHaveLength(1);
		});
	});
});
