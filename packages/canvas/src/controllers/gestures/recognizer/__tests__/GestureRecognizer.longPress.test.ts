import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import { LONG_PRESS_DURATION_MS } from "../GestureRecognizerConstants";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

/**
 * Behavior coverage for the touch long press.
 *
 * Spec under test:
 *   - a touch press held for LONG_PRESS_DURATION_MS within the drag slop fires
 *     longPress and consumes the gesture (the lift fires nothing — no click)
 *   - jitter within the slop does not disarm it; a confirmed drag does
 *   - pinch entry, lift, cancel and cancelPendingGesture all disarm it
 *   - mouse presses never arm it
 *
 * Same harness as GestureRecognizer.behaviors.test.ts plus vitest fake timers:
 * the timer fire enqueues a synthetic event, so a RAF flush must follow the
 * timer advance for the gesture to fire.
 */

vi.mock("../utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
			x: clientX,
			y: clientY,
		}),
		getGestureTarget: () => ({ id: "obj-1", kind: "rect" }),
		createGetHovered: () => () => [],
		getInputValue: () => undefined,
		readInputValue: () => undefined,
		isGestureOptedOut: () => false,
		isNativePointerTarget: () => false,
		detectEdgeProximity: () => ({ isNearEdge: false }),
		calculateScrollDelta: () => ({ deltaX: 0, deltaY: 0 }),
	};
});

let rafCallbacks: FrameRequestCallback[] = [];

const flushRaf = (): void => {
	const pending = rafCallbacks;
	rafCallbacks = [];
	for (const cb of pending) {
		cb(performance.now());
	}
};

/** Advance the long-press timer, then drain the RAF batch its fire scheduled. */
const elapseLongPress = (): void => {
	vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
	flushRaf();
};

beforeEach(() => {
	rafCallbacks = [];
	vi.useFakeTimers();
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
		rafCallbacks.push(cb);
		return rafCallbacks.length;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
		rafCallbacks.splice(id - 1, 1);
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

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

// pointerType defaults to "touch": the long press is touch-only and the mouse
// case is the explicitly-labeled exception.
const makeEvent = (
	type: string,
	clientX: number,
	clientY: number,
	timeStamp: number,
	options: { pointerId?: number; pointerType?: string } = {},
): MockPointerEvent => ({
	type,
	pointerId: options.pointerId ?? 1,
	pointerType: options.pointerType ?? "touch",
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
				edgeScrollEnabled: false,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
		} as GestureRecognizerConfig["canvasStateRef"],
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
			case "pointercancel":
				handlers.onPointerCancel(e as never);
				break;
		}
	};
	const types = () => events.map((e) => e.type);
	return { events, recognizer, dispatch, types };
};

describe("GestureRecognizer long press", () => {
	it("a held touch press fires longPress and the lift fires nothing", () => {
		const { dispatch, types, events } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		flushRaf();
		elapseLongPress();

		expect(types()).toEqual(["pressed", "longPress"]);
		expect(events.at(-1)?.last).toEqual({ x: 100, y: 100 });
		expect(events.at(-1)?.targetKind).toBe("rect");

		// The gesture is consumed: no click / dragEnd on release
		dispatch(makeEvent("pointerup", 100, 100, 2000));
		flushRaf();
		expect(types()).toEqual(["pressed", "longPress"]);
	});

	it("jitter within the touch drag slop keeps the hold armed and updates the position", () => {
		const { dispatch, types, events } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		dispatch(makeEvent("pointermove", 105, 100, 1100)); // 5px < 10px touch slop
		flushRaf();
		elapseLongPress();

		expect(types()).toEqual(["pressed", "longPress"]);
		expect(events.at(-1)?.last).toEqual({ x: 105, y: 100 });
	});

	it("a confirmed drag disarms the long press", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 120, 100, 1100)); // 20px >= touch slop
		flushRaf();
		elapseLongPress();

		expect(types()).toEqual(["pressed", "dragStart"]);
	});

	it("lifting before the duration yields a click and no longPress later", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		dispatch(makeEvent("pointerup", 100, 100, 1100));
		flushRaf();
		elapseLongPress();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("entering a pinch disarms the long press", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1100, { pointerId: 2 }));
		flushRaf();
		elapseLongPress();

		expect(types()).toEqual(["pressed"]);
	});

	it("pointercancel disarms the long press", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		flushRaf();
		dispatch(makeEvent("pointercancel", 100, 100, 1100));
		flushRaf();
		elapseLongPress();

		expect(types()).toEqual(["pressed"]);
	});

	it("cancelPendingGesture disarms the long press", () => {
		const { dispatch, recognizer, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		flushRaf();
		recognizer.cancelPendingGesture();
		elapseLongPress();

		expect(types()).toEqual(["pressed"]);
	});

	it("a mouse press never arms a long press", () => {
		const { dispatch, types } = setup();

		dispatch(
			makeEvent("pointerdown", 100, 100, 1000, { pointerType: "mouse" }),
		);
		flushRaf();
		elapseLongPress();
		dispatch(makeEvent("pointerup", 100, 100, 2000, { pointerType: "mouse" }));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});
});
