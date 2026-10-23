import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import type { GestureRecognizerConfig } from "../GestureRecognizerTypes";
import type * as RecognizerTargeting from "../targeting";
import type * as RecognizerUtils from "../utils";

/**
 * wrapFrameDispatch: every gesture a rAF frame dispatches (event batch or fling
 * frame) runs inside the wrapper, and the synchronous drain does not.
 */

vi.mock("../targeting", async (importActual) => {
	const actual = await importActual<typeof RecognizerTargeting>();
	return {
		...actual,
		getGestureTarget: () => ({ id: "canvas", kind: "canvas" }),
		createGetHovered: () => () => [],
		getInputValue: () => undefined,
		readInputValue: () => undefined,
		isGestureOptedOut: () => false,
		isNativePointerTarget: () => false,
	};
});

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
const FRAME_MS = 16;

const makeEvent = (
	type: string,
	clientX: number,
	timeStamp: number,
	button = 0,
) => ({
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
	// Ordered record of wrapper entries/exits and gesture types.
	const callLog: string[] = [];
	const config: GestureRecognizerConfig = {
		gestureCallback: (gesture) => callLog.push(gesture.type),
		containerRef: { current: null },
		svgRef: { current: null },
		canvasStateRef: {
			current: {
				edgeScrollEnabled: false,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
		},
		shouldFlingFromDrag: (button) => button === RIGHT_BUTTON,
		wrapFrameDispatch: (dispatchFrame) => {
			callLog.push("frame:begin");
			dispatchFrame();
			callLog.push("frame:end");
		},
	};
	const recognizer = new GestureRecognizer(config);
	const handlers = recognizer.getHandlers();
	const dispatchEvent = (event: ReturnType<typeof makeEvent>): void => {
		switch (event.type) {
			case "pointerdown":
				handlers.onPointerDown(event as never);
				break;
			case "pointermove":
				handlers.onPointerMove(event as never);
				break;
			case "pointerup":
				handlers.onPointerUp(event as never);
				break;
		}
	};
	return { callLog, recognizer, dispatchEvent };
};

describe("GestureRecognizer - wrapFrameDispatch", () => {
	it("wraps one rAF batch once, with its gestures fired inside", () => {
		const { callLog, dispatchEvent } = setup();

		dispatchEvent(makeEvent("pointerdown", 0, 0));
		dispatchEvent(makeEvent("pointermove", 10, 4));
		dispatchEvent(makeEvent("pointerup", 10, 8));
		expect(callLog).toEqual([]);

		flushRaf(FRAME_MS);

		expect(callLog).toEqual([
			"frame:begin",
			"pressed",
			"dragStart",
			"dragEnd",
			"frame:end",
		]);
	});

	it("wraps each fling frame", () => {
		const { callLog, dispatchEvent } = setup();

		// A firm rightward flick with the right button, released while moving.
		dispatchEvent(makeEvent("pointerdown", 400, 0, RIGHT_BUTTON));
		flushRaf(0);
		let time = 0;
		for (let step = 1; step <= 3; step++) {
			time = step * FRAME_MS;
			dispatchEvent(
				makeEvent("pointermove", 400 + step * 40, time, RIGHT_BUTTON),
			);
			flushRaf(time);
		}
		dispatchEvent(makeEvent("pointerup", 520, time, RIGHT_BUTTON));
		flushRaf(time);
		callLog.length = 0;

		flushRaf(time + FRAME_MS);

		expect(callLog).toEqual(["frame:begin", "inertialScroll", "frame:end"]);
	});

	it("does not wrap the synchronous drain of processPendingBatch", () => {
		const { callLog, recognizer, dispatchEvent } = setup();

		dispatchEvent(makeEvent("pointerdown", 0, 0));
		recognizer.processPendingBatch();

		expect(callLog).toEqual(["pressed"]);
		// The drained batch cancelled its rAF, so nothing runs (or wraps) later.
		flushRaf(FRAME_MS);
		expect(callLog).toEqual(["pressed"]);
	});
});
