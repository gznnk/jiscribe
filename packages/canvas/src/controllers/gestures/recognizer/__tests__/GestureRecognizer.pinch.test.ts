import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

/**
 * Behavior coverage for the two-finger touch pinch (pan + zoom).
 *
 * State machine under test:
 *   - a second touch pointerdown before dragStart discards the press (no click)
 *     and enters pinch mode; during a canvas pan drag it closes the pan with
 *     dragEnd and enters the pinch; during an object drag or shape drawing it is
 *     ignored (#25 palm rejection)
 *   - pinch moves fire pinch gestures with zoomScale (finger-distance ratio) and
 *     scrollDelta (negated midpoint movement), both relative to the last fired event
 *   - either finger lifting ends the pinch; the survivor stays inert until re-pressed
 *   - only touch pointers participate — a mouse/pen second pointerdown never pinches
 *
 * Same harness as GestureRecognizer.behaviors.test.ts: DOM-dependent utils are
 * stubbed (getSvgPoint maps client coords 1:1 to world), RAF is flushed manually.
 */

const mockUtil = vi.hoisted(() => ({
	isNativePointer: false,
	kindAndId: { id: "obj-1", kind: "rect" } as { id: string; kind: string },
}));

vi.mock("../utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
			x: clientX,
			y: clientY,
		}),
		getKindAndId: () => mockUtil.kindAndId,
		createGetHovered: () => () => [],
		getInputValue: () => undefined,
		readInputValue: () => undefined,
		isGestureOptedOut: () => false,
		isNativePointerTarget: () => mockUtil.isNativePointer,
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

beforeEach(() => {
	rafCallbacks = [];
	mockUtil.isNativePointer = false;
	mockUtil.kindAndId = { id: "obj-1", kind: "rect" };
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

// pointerType defaults to "touch": this file is about the touch-only pinch path,
// and the mouse case is the explicitly-labeled exception.
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

const setup = (
	options: { container?: HTMLElement; shapeDrawing?: object } = {},
) => {
	const events: Gesture[] = [];
	const config: GestureRecognizerConfig = {
		gestureCallback: (g) => events.push(g),
		containerRef: { current: options.container ?? null },
		svgRef: { current: null },
		canvasStateRef: {
			current: {
				edgeScrollEnabled: false,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
				shapeDrawing: options.shapeDrawing ?? null,
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

/** A capture-recording stand-in for the container element. */
const makeContainer = () => {
	const setPointerCapture = vi.fn();
	const releasePointerCapture = vi.fn();
	return {
		container: {
			setPointerCapture,
			hasPointerCapture: () => true,
			releasePointerCapture,
		} as never,
		setPointerCapture,
		releasePointerCapture,
	};
};

describe("GestureRecognizer pinch entry", () => {
	it("a second touch before dragStart discards the press: no click on release", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		// Lifting both fingers must not produce click / doubleClick / dragEnd
		dispatch(makeEvent("pointerup", 100, 100, 1020, { pointerId: 1 }));
		dispatch(makeEvent("pointerup", 200, 100, 1030, { pointerId: 2 }));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("a second touch during a canvas pan drag closes it with dragEnd and enters the pinch", () => {
		mockUtil.kindAndId = { id: "canvas", kind: "canvas" };
		const { dispatch, types, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 20, 0, 1016, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 120, 0, 1020, { pointerId: 2 }));
		flushRaf();

		// The pan drag is closed at its last position before the pinch takes over
		expect(types()).toEqual(["pressed", "dragStart", "dragEnd"]);
		expect(events.at(-1)?.last).toEqual({ x: 20, y: 0 });

		// The two fingers now drive a pinch
		dispatch(makeEvent("pointermove", 220, 0, 1032, { pointerId: 2 }));
		flushRaf();
		expect(events.at(-1)?.type).toBe("pinch");
		expect(events.at(-1)?.zoomScale).toBe(2);
	});

	it("a second touch while drawing a shape is ignored (no pinch, no dragEnd)", () => {
		mockUtil.kindAndId = { id: "canvas", kind: "canvas" };
		const { dispatch, types } = setup({ shapeDrawing: {} });

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 20, 0, 1016, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 120, 0, 1020, { pointerId: 2 }));
		flushRaf();
		// The first finger keeps drawing
		dispatch(makeEvent("pointermove", 40, 0, 1032, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart", "drag"]);
	});

	it("after dragStart a second touch is ignored and the drag continues (#25)", () => {
		const { dispatch, types, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 20, 0, 1016, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 50, 50, 1020, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 40, 0, 1032, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerup", 40, 0, 1048, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart", "drag", "dragEnd"]);
		expect(events.at(-1)?.last).toEqual({ x: 40, y: 0 });
	});

	it("a mouse second pointerdown never enters a pinch (release yields a click)", () => {
		const { dispatch, types } = setup();

		dispatch(
			makeEvent("pointerdown", 100, 100, 1000, {
				pointerId: 1,
				pointerType: "mouse",
			}),
		);
		flushRaf();
		dispatch(
			makeEvent("pointerdown", 200, 100, 1010, {
				pointerId: 2,
				pointerType: "mouse",
			}),
		);
		flushRaf();
		dispatch(
			makeEvent("pointerup", 100, 100, 1020, {
				pointerId: 1,
				pointerType: "mouse",
			}),
		);
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("a native-pointer press (slider) is not converted: the second touch is ignored", () => {
		mockUtil.isNativePointer = true;
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointerup", 100, 100, 1020, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});
});

describe("GestureRecognizer pinch gestures", () => {
	it("a pinch move fires zoomScale (distance ratio) and scrollDelta (negated midpoint movement) with the midpoint as last", () => {
		const { dispatch, events } = setup();

		// Fingers at (100,100) and (200,100): mid (150,100), distance 100
		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		// Finger 2 spreads to (300,100): mid (200,100), distance 200
		dispatch(makeEvent("pointermove", 300, 100, 1020, { pointerId: 2 }));
		flushRaf();

		const pinch = events.at(-1)!;
		expect(pinch.type).toBe("pinch");
		expect(pinch.zoomScale).toBe(2);
		expect(pinch.scrollDelta).toEqual({ deltaX: -50, deltaY: 0 });
		expect(pinch.last).toEqual({ x: 200, y: 100 });
		expect(pinch.targetId).toBe("canvas");
		expect(pinch.targetKind).toBe("canvas");
	});

	it("consecutive moves are relative to the last fired pinch event, not the pinch start", () => {
		const { dispatch, events } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 300, 100, 1020, { pointerId: 2 }));
		flushRaf();
		// Finger 2 pulls back to (250,100): mid 200 -> 175, distance 200 -> 150
		dispatch(makeEvent("pointermove", 250, 100, 1030, { pointerId: 2 }));
		flushRaf();

		const pinch = events.at(-1)!;
		expect(pinch.type).toBe("pinch");
		expect(pinch.zoomScale).toBe(0.75);
		expect(pinch.scrollDelta).toEqual({ deltaX: 25, deltaY: 0 });
		expect(pinch.last).toEqual({ x: 175, y: 100 });
	});

	it("both fingers moving in parallel in one frame fire a single pure-pan event (zoomScale 1)", () => {
		const { dispatch, events } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		// Both fingers +100 in x within one frame: the moves coalesce into one pinch
		// event per frame (a second one would anchor against a stale viewBox)
		dispatch(makeEvent("pointermove", 200, 100, 1020, { pointerId: 1 }));
		dispatch(makeEvent("pointermove", 300, 100, 1020, { pointerId: 2 }));
		flushRaf();

		const pinches = events.filter((e) => e.type === "pinch");
		expect(pinches).toHaveLength(1);
		expect(pinches[0].zoomScale).toBe(1);
		expect(pinches[0].scrollDelta).toEqual({ deltaX: -100, deltaY: 0 });
		expect(pinches[0].last).toEqual({ x: 250, y: 100 });
	});

	it("degenerate finger distance holds zoomScale at 1 (no division blow-up)", () => {
		const { dispatch, events } = setup();

		// Both fingers on the same point: distance 0
		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 100, 100, 1010, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 300, 100, 1020, { pointerId: 2 }));
		flushRaf();

		const pinch = events.at(-1)!;
		expect(pinch.type).toBe("pinch");
		expect(pinch.zoomScale).toBe(1);
	});
});

describe("GestureRecognizer pinch exit", () => {
	it("one finger lifting ends the pinch; the survivor is inert until re-pressed", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointerup", 200, 100, 1020, { pointerId: 2 }));
		flushRaf();
		// The surviving finger neither pinches nor drags
		dispatch(makeEvent("pointermove", 150, 150, 1030, { pointerId: 1 }));
		dispatch(makeEvent("pointerup", 150, 150, 1040, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed"]);

		// A fresh press starts a normal gesture again
		dispatch(makeEvent("pointerdown", 100, 100, 2000, { pointerId: 3 }));
		dispatch(makeEvent("pointerup", 100, 100, 2010, { pointerId: 3 }));
		flushRaf();
		expect(types()).toEqual(["pressed", "pressed", "click"]);
	});

	it("pointercancel of a pinch finger also ends the pinch silently", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointercancel", 200, 100, 1020, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointermove", 300, 100, 1030, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("a third finger neither joins the pinch nor starts a new gesture", () => {
		const { dispatch, types, events } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 150, 200, 1020, { pointerId: 3 }));
		flushRaf();

		expect(types()).toEqual(["pressed"]);

		// The pinch still works after the third finger's interruption
		dispatch(makeEvent("pointermove", 300, 100, 1030, { pointerId: 2 }));
		flushRaf();
		expect(events.at(-1)?.type).toBe("pinch");
	});
});

describe("GestureRecognizer pinch pointer capture", () => {
	it("captures the second pointer on entry and releases both on exit", () => {
		const { container, setPointerCapture, releasePointerCapture } =
			makeContainer();
		const { dispatch } = setup({ container });

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();

		expect(setPointerCapture).toHaveBeenCalledWith(1);
		expect(setPointerCapture).toHaveBeenCalledWith(2);

		dispatch(makeEvent("pointerup", 200, 100, 1020, { pointerId: 2 }));
		flushRaf();

		expect(releasePointerCapture).toHaveBeenCalledWith(1);
		expect(releasePointerCapture).toHaveBeenCalledWith(2);
	});

	it("cancelPendingGesture during a pinch releases both captures and clears the pinch", () => {
		const { container, releasePointerCapture } = makeContainer();
		const { dispatch, recognizer, events } = setup({ container });

		dispatch(makeEvent("pointerdown", 100, 100, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 200, 100, 1010, { pointerId: 2 }));
		flushRaf();

		recognizer.cancelPendingGesture();

		expect(releasePointerCapture).toHaveBeenCalledWith(1);
		expect(releasePointerCapture).toHaveBeenCalledWith(2);

		// Moves after the abort fire nothing
		dispatch(makeEvent("pointermove", 300, 100, 1020, { pointerId: 2 }));
		flushRaf();
		expect(events.map((e) => e.type)).toEqual(["pressed"]);
	});
});
