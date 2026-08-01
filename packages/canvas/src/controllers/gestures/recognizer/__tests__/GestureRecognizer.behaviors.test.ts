import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import { DOUBLE_CLICK_THRESHOLD } from "../GestureRecognizerConstants";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

/**
 * Behavior coverage test for GestureRecognizer.
 *
 * Covers paths that the batchOrdering / edgeScroll tests do not:
 *   - click / doubleClick decisions (threshold, triple-tap suppression, target-independence)
 *   - multitouch (ignoring a second non-touch pointerdown; the touch pinch path
 *     is covered by GestureRecognizer.pinch.test.ts)
 *   - pointercancel (dragEnd while dragging / silent when not dragging)
 *   - turning a wheel outside a drag into a wheel gesture
 *   - propagation of mods / button / targetKind
 *   - origin suppression via isGestureOptedOut
 *   - lifecycle of cancelPendingGesture (abort, capture release, non-terminal resume)
 *
 * DOM-dependent utilities are replaced with deterministic stubs. getKindAndId's return value
 * (= presence of targetId/targetKind) is switched per test via mockUtil.
 */

const mockUtil = vi.hoisted(() => ({
	kindAndId: { id: "obj-1", kind: "rect" } as {
		id: string;
		kind: string;
	} | null,
	optedOut: false,
	inputValue: undefined as string | undefined,
	// world = client / zoom, letting tests verify screen-based decisions under zoom
	zoom: 1,
}));

// Replace only the DOM/layout-dependent utilities with deterministic stubs; use the real
// pure logic (isDoubleClick, etc.). We want to verify doubleClick's distance/time decisions
// at the wiring level, so do not mock that implementation here.
vi.mock("../utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
			x: clientX / mockUtil.zoom,
			y: clientY / mockUtil.zoom,
		}),
		getKindAndId: () => mockUtil.kindAndId,
		createGetHovered: () => () => [],
		getInputValue: () => mockUtil.inputValue,
		readInputValue: () => mockUtil.inputValue,
		isGestureOptedOut: () => mockUtil.optedOut,
		isNativePointerTarget: () => false,
		detectEdgeProximity: () => ({ isNearEdge: false }),
		calculateScrollDelta: () => ({ deltaX: 0, deltaY: 0 }),
	};
});

let rafCallbacks: FrameRequestCallback[] = [];
let cancelledIds: number[] = [];

const flushRaf = (): void => {
	const pending = rafCallbacks;
	rafCallbacks = [];
	for (const cb of pending) {
		cb(performance.now());
	}
};

beforeEach(() => {
	rafCallbacks = [];
	cancelledIds = [];
	mockUtil.kindAndId = { id: "obj-1", kind: "rect" };
	mockUtil.optedOut = false;
	mockUtil.inputValue = undefined;
	mockUtil.zoom = 1;
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
		rafCallbacks.push(cb);
		return rafCallbacks.length;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
		cancelledIds.push(id);
		rafCallbacks.splice(id - 1, 1);
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

type Mods = {
	shiftKey?: boolean;
	altKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
};

type MockPointerEvent = {
	type: string;
	pointerId: number;
	pointerType?: string;
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
	options: {
		pointerId?: number;
		pointerType?: string;
		button?: number;
		mods?: Mods;
	} = {},
): MockPointerEvent => ({
	type,
	pointerId: options.pointerId ?? 1,
	pointerType: options.pointerType,
	clientX,
	clientY,
	shiftKey: options.mods?.shiftKey ?? false,
	altKey: options.mods?.altKey ?? false,
	ctrlKey: options.mods?.ctrlKey ?? false,
	metaKey: options.mods?.metaKey ?? false,
	target: {} as EventTarget,
	timeStamp,
	button: options.button ?? 0,
});

const makeWheelEvent = (
	clientX: number,
	clientY: number,
	deltaX: number,
	deltaY: number,
	timeStamp: number,
): WheelEvent =>
	({
		clientX,
		clientY,
		deltaX,
		deltaY,
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		target: {} as EventTarget,
		timeStamp,
	}) as never;

const setup = (options: { container?: HTMLElement } = {}) => {
	const events: Gesture[] = [];
	const config: GestureRecognizerConfig = {
		gestureCallback: (g) => events.push(g),
		containerRef: { current: options.container ?? null },
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
			case "pointercancel":
				handlers.onPointerCancel(e as never);
				break;
		}
	};
	const types = () => events.map((e) => e.type);
	return { events, recognizer, dispatch, wheelHandler, types };
};

describe("GestureRecognizer click / doubleClick", () => {
	it("two clicks on the same target within DOUBLE_CLICK_THRESHOLD produce doubleClick", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 0, 0, 1100));
		dispatch(makeEvent("pointerup", 0, 0, 1100));
		flushRaf();

		expect(types()).toEqual(["pressed", "click", "pressed", "doubleClick"]);
	});

	it("the second is also a click when the interval exceeds the threshold", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 0, 0, 1000 + DOUBLE_CLICK_THRESHOLD));
		dispatch(makeEvent("pointerup", 0, 0, 1000 + DOUBLE_CLICK_THRESHOLD));
		flushRaf();

		expect(types()).toEqual(["pressed", "click", "pressed", "click"]);
	});

	it("the third tap is not a doubleClick (consecutive doubleClick suppression)", () => {
		const { dispatch, events } = setup();

		// Three consecutive clicks (all 100ms apart)
		for (let i = 0; i < 3; i++) {
			const t = 1000 + i * 100;
			dispatch(makeEvent("pointerdown", 0, 0, t));
			dispatch(makeEvent("pointerup", 0, 0, t));
			flushRaf();
		}

		const finals = events.filter(
			(e) => e.type === "click" || e.type === "doubleClick",
		);
		// click (1st) -> doubleClick (2nd) -> click (3rd is reset, so not a doubleClick)
		expect(finals.map((e) => e.type)).toEqual([
			"click",
			"doubleClick",
			"click",
		]);
	});

	it("a doubleClick even when the target differs, as long as time and position match (OS convention; a control appearing under the cursor after the first click must not swallow the pair)", () => {
		const { dispatch, types, events } = setup();

		mockUtil.kindAndId = { id: "obj-1", kind: "connector" };
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();

		mockUtil.kindAndId = { id: "obj-1", kind: "control" };
		dispatch(makeEvent("pointerdown", 0, 0, 1100));
		dispatch(makeEvent("pointerup", 0, 0, 1100));
		flushRaf();

		expect(types()).toEqual(["pressed", "click", "pressed", "doubleClick"]);
		// The doubleClick targets the second click's element
		expect(events[3].targetKind).toBe("control");
	});

	it("still counts as a click even with a tiny move below DRAG_THRESHOLD in between", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointermove", 1, 0, 1004)); // 1px < 3px (threshold)
		dispatch(makeEvent("pointerup", 1, 0, 1008));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("the first click on the background (targetId undefined) is a click even with a small timeStamp", () => {
		const { dispatch, types } = setup();

		// Regression: previously "no recent click recorded" was represented as undefined, so when
		// targetId was undefined (background) and timeStamp < threshold, the first click turned into
		// a doubleClick. Separating lastClick=null (no baseline recorded) ensures the first is always a click.
		mockUtil.kindAndId = null;
		dispatch(makeEvent("pointerdown", 0, 0, 100));
		dispatch(makeEvent("pointerup", 0, 0, 100));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("the third tap right after a doubleClick is a click even on the background (baseline reset)", () => {
		const { dispatch, events } = setup();

		mockUtil.kindAndId = null;
		for (let i = 0; i < 3; i++) {
			const t = 1000 + i * 100;
			dispatch(makeEvent("pointerdown", 0, 0, t));
			dispatch(makeEvent("pointerup", 0, 0, t));
			flushRaf();
		}

		const finals = events.filter(
			(e) => e.type === "click" || e.type === "doubleClick",
		);
		expect(finals.map((e) => e.type)).toEqual([
			"click",
			"doubleClick",
			"click",
		]);
	});
});

// Non-touch pointers (makeEvent leaves pointerType unset) never enter a pinch,
// so a second pointerdown is simply ignored.
describe("GestureRecognizer multitouch suppression", () => {
	it("a second pointerdown during an ongoing gesture is ignored", () => {
		const { dispatch, events, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		// Dispatch a second one with a different pointerId -> pressed does not fire
		dispatch(makeEvent("pointerdown", 50, 50, 1010, { pointerId: 2 }));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
		// Only the first pointer's pressed
		expect(events.filter((e) => e.type === "pressed")).toHaveLength(1);
	});

	it("the second pointer's move / up are also ignored", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 50, 50, 1010, { pointerId: 2 }));
		dispatch(makeEvent("pointermove", 90, 90, 1020, { pointerId: 2 }));
		dispatch(makeEvent("pointerup", 90, 90, 1030, { pointerId: 2 }));
		flushRaf();
		// Releasing the first pointer yields a click (not polluted by the second)
		dispatch(makeEvent("pointerup", 0, 0, 1040, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});
});

describe("GestureRecognizer pointercancel", () => {
	it("pointercancel during a drag closes it with dragEnd", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 20, 0, 1016));
		flushRaf();
		dispatch(makeEvent("pointercancel", 20, 0, 1032));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart", "dragEnd"]);
	});

	it("pointercancel without a drag fires nothing (not even a click)", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointercancel", 0, 0, 1016));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("after pointercancel, pressed is discarded and the following up is ignored", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointercancel", 0, 0, 1016));
		flushRaf();
		dispatch(makeEvent("pointerup", 0, 0, 1032));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});
});

describe("GestureRecognizer wheel (outside a drag)", () => {
	it("a wheel outside a drag becomes a wheel gesture with targetId fixed to canvas", () => {
		const { wheelHandler, events } = setup();

		wheelHandler(makeWheelEvent(100, 200, 5, -12, 1000));
		flushRaf();

		expect(events).toHaveLength(1);
		const wheel = events[0];
		expect(wheel.type).toBe("wheel");
		expect(wheel.targetId).toBe("canvas");
		expect(wheel.targetKind).toBe("canvas");
		expect(wheel.scrollDelta).toEqual({ deltaX: 5, deltaY: -12 });
		// wheel sets the cursor position as start/last, with delta of 0
		expect(wheel.start).toEqual({ x: 100, y: 200 });
		expect(wheel.delta).toEqual({ x: 0, y: 0 });
	});
});

describe("GestureRecognizer wheel during a drag -> scroll", () => {
	it("a wheel during a drag merges into the drag's scrollDelta", () => {
		const { dispatch, wheelHandler, events } = setup();

		dispatch(makeEvent("pointerdown", 100, 100, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 130, 100, 1016)); // dragStart
		flushRaf();
		wheelHandler(makeWheelEvent(130, 100, 8, 0, 1032));
		flushRaf();

		const drags = events.filter((e) => e.type === "drag");
		expect(drags).toHaveLength(1);
		expect(drags[0].scrollDelta).toEqual({ deltaX: 8, deltaY: 0 });
	});
});

describe("GestureRecognizer propagated properties (mods / button / targetKind)", () => {
	it("modifier keys are propagated to pressed", () => {
		const { dispatch, events } = setup();

		dispatch(
			makeEvent("pointerdown", 0, 0, 1000, {
				mods: { shiftKey: true, altKey: true },
			}),
		);
		flushRaf();

		expect(events[0].mods).toEqual({
			shift: true,
			alt: true,
			ctrl: false,
			meta: false,
		});
	});

	it("button (right click = 2) is propagated through the whole gesture sequence", () => {
		const { dispatch, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { button: 2 }));
		flushRaf();
		dispatch(makeEvent("pointerup", 0, 0, 1000, { button: 2 }));
		flushRaf();

		for (const e of events) {
			expect(e.button).toBe(2);
		}
	});

	it("targetKind is propagated to pressed", () => {
		const { dispatch, events } = setup();

		mockUtil.kindAndId = { id: "node-7", kind: "ellipse" };
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();

		expect(events[0].targetId).toBe("node-7");
		expect(events[0].targetKind).toBe("ellipse");
	});
});

describe("GestureRecognizer isGestureOptedOut", () => {
	it("a pointerdown originating from an opt-out element is not a gesture origin", () => {
		const { dispatch, events } = setup();

		mockUtil.optedOut = true;
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();

		expect(events).toHaveLength(0);
	});
});

describe("GestureRecognizer lifecycle", () => {
	it("cancelPendingGesture discards a pending drag", () => {
		const { dispatch, recognizer, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		// Queue a move but cancel before flushing
		dispatch(makeEvent("pointermove", 50, 0, 1016));
		recognizer.cancelPendingGesture();
		flushRaf();
		// pressed is already discarded, so the following up is ignored too
		dispatch(makeEvent("pointerup", 50, 0, 1032));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("cancelPendingGesture cancels pending RAFs and does not fire the callback", () => {
		const { dispatch, recognizer, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000)); // Schedule one RAF
		recognizer.cancelPendingGesture();
		flushRaf();

		expect(cancelledIds.length).toBeGreaterThan(0);
		expect(events).toHaveLength(0);
	});

	it("cancelPendingGesture releases the pointer capture held by an in-progress drag", () => {
		const captured: number[] = [];
		const released: number[] = [];
		const container = {
			setPointerCapture: (pointerId: number) => captured.push(pointerId),
			hasPointerCapture: () => true,
			releasePointerCapture: (pointerId: number) => released.push(pointerId),
		} as unknown as HTMLElement;
		const { dispatch, recognizer, types } = setup({ container });

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 50, 0, 1016));
		flushRaf();
		expect(captured).toEqual([1]);

		recognizer.cancelPendingGesture();
		expect(released).toEqual([1]);

		// pressed is gone: the still-held pointer no longer drives the drag
		dispatch(makeEvent("pointermove", 100, 0, 1032));
		dispatch(makeEvent("pointerup", 100, 0, 1048));
		flushRaf();
		expect(types()).toEqual(["pressed", "dragStart"]);
	});

	// StrictMode runs effect setup→cleanup→setup on the same component without
	// re-rendering, so the hook keeps using the same instance across the cleanup.
	// This locks the contract that cancelPendingGesture is NOT terminal (#78).
	it("cancelPendingGesture is not terminal: the same instance keeps recognizing gestures", () => {
		const { dispatch, recognizer, types } = setup();

		// Cleanup fires while an event batch is still pending
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		recognizer.cancelPendingGesture();
		flushRaf();
		expect(types()).toEqual([]);

		// After the re-setup, a full gesture must run on the same instance
		dispatch(makeEvent("pointerdown", 0, 0, 2000));
		flushRaf();
		dispatch(makeEvent("pointermove", 50, 0, 2016));
		flushRaf();
		dispatch(makeEvent("pointermove", 80, 0, 2032));
		flushRaf();
		dispatch(makeEvent("pointerup", 80, 0, 2048));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart", "drag", "dragEnd"]);
	});
});

// The drag threshold is per pointerType (touch gets a wider slop than mouse/pen)
// and measured in screen pixels, so the feel does not change with zoom.
describe("GestureRecognizer drag threshold (per pointerType, screen px)", () => {
	it("a touch move within the touch slop still resolves to a click", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerType: "touch" }));
		dispatch(makeEvent("pointermove", 9, 0, 1016, { pointerType: "touch" }));
		dispatch(makeEvent("pointerup", 9, 0, 1032, { pointerType: "touch" }));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("a touch move beyond the touch slop confirms the drag", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerType: "touch" }));
		flushRaf();
		dispatch(makeEvent("pointermove", 10, 0, 1016, { pointerType: "touch" }));
		flushRaf();
		dispatch(makeEvent("pointerup", 10, 0, 1032, { pointerType: "touch" }));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart", "dragEnd"]);
	});

	it("a mouse move of the same size already drags (the narrow mouse threshold)", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 9, 0, 1016));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart"]);
	});

	it("the decision is screen-based: a 4px screen move confirms even when zoom shrinks it to 1 world px", () => {
		mockUtil.zoom = 4;
		const { dispatch, types, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 4, 0, 1016));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart"]);
		// World coordinates on the gesture still reflect the zoomed mapping
		expect(events.at(-1)?.last).toEqual({ x: 1, y: 0 });
	});
});

// Processing is deferred to the RAF batch, so a quick touch tap can be fully over
// before its pointerdown is processed; the DOM then rejects capture calls for the
// no-longer-active pointer with NotFoundError. The recognizer must survive that
// and still deliver the gesture.
describe("GestureRecognizer pointer capture safety", () => {
	it("a touch that lifted before the RAF batch ran still yields its tap (NotFoundError tolerated)", () => {
		const container = {
			setPointerCapture: () => {
				throw new DOMException(
					"No active pointer with the given id is found.",
					"NotFoundError",
				);
			},
			hasPointerCapture: () => false,
			releasePointerCapture: () => {
				throw new DOMException(
					"No active pointer with the given id is found.",
					"NotFoundError",
				);
			},
		} as unknown as HTMLElement;
		const { dispatch, types } = setup({ container });

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1010));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});
});

// The boundary precision of the threshold is covered by isDoubleClick's solitary test. Here we
// check, with representative near/far cases, that the recognizer correctly snapshots the
// pointerdown position and passes it to the decision (= pipeline wiring).
describe("GestureRecognizer doubleClick distance threshold (wiring)", () => {
	const finalsOf = (events: Gesture[]) =>
		events
			.filter((e) => e.type === "click" || e.type === "doubleClick")
			.map((e) => e.type);

	it("re-clicking far away within the time window is a separate click", () => {
		const { dispatch, events } = setup();

		// Same target and within the time window, but the two clicks are far apart.
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 100, 0, 1100));
		dispatch(makeEvent("pointerup", 100, 0, 1100));
		flushRaf();

		expect(finalsOf(events)).toEqual(["click", "click"]);
	});

	it("even on the background (targetId undefined), a close distance produces a doubleClick", () => {
		const { dispatch, events } = setup();

		mockUtil.kindAndId = null;
		dispatch(makeEvent("pointerdown", 200, 200, 1000));
		dispatch(makeEvent("pointerup", 200, 200, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 202, 201, 1100)); // distance sqrt(5) < 5px
		dispatch(makeEvent("pointerup", 202, 201, 1100));
		flushRaf();

		expect(finalsOf(events)).toEqual(["click", "doubleClick"]);
	});

	it("two touch taps beyond the mouse distance threshold still pair (touch gets the wider threshold)", () => {
		const { dispatch, events } = setup();

		// 10px apart: outside the 5px mouse threshold, inside the 20px touch one.
		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerType: "touch" }));
		dispatch(makeEvent("pointerup", 0, 0, 1000, { pointerType: "touch" }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 10, 0, 1100, { pointerType: "touch" }));
		dispatch(makeEvent("pointerup", 10, 0, 1100, { pointerType: "touch" }));
		flushRaf();

		expect(finalsOf(events)).toEqual(["click", "doubleClick"]);
	});

	it("regression: two consecutive background clicks at different positions do not coalesce into a doubleClick", () => {
		const { dispatch, events } = setup();

		// Both targetIds are undefined, but the positions are far apart, so the distance check yields separate clicks.
		mockUtil.kindAndId = null;
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 500, 500, 1100));
		dispatch(makeEvent("pointerup", 500, 500, 1100));
		flushRaf();

		expect(finalsOf(events)).toEqual(["click", "click"]);
	});
});
