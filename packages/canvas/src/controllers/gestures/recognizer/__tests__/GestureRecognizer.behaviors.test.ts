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
 *   - click / doubleClick decisions (threshold, triple-tap suppression, target difference)
 *   - multitouch (ignoring the second pointerdown)
 *   - pointercancel (dragEnd while dragging / silent when not dragging)
 *   - turning a wheel outside a drag into a wheel gesture
 *   - propagation of mods / button / targetKind
 *   - origin suppression via isGestureOptedOut
 *   - lifecycle of resetGestureState / dispose
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
}));

// Replace only the DOM/layout-dependent utilities with deterministic stubs; use the real
// pure logic (isDoubleClick, etc.). We want to verify doubleClick's distance/time decisions
// at the wiring level, so do not mock that implementation here.
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
	options: { pointerId?: number; button?: number; mods?: Mods } = {},
): MockPointerEvent => ({
	type,
	pointerId: options.pointerId ?? 1,
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

	it("stays a click even within the time window if the target differs", () => {
		const { dispatch, types } = setup();

		mockUtil.kindAndId = { id: "obj-1", kind: "rect" };
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();

		mockUtil.kindAndId = { id: "obj-2", kind: "rect" };
		dispatch(makeEvent("pointerdown", 0, 0, 1100));
		dispatch(makeEvent("pointerup", 0, 0, 1100));
		flushRaf();

		expect(types()).toEqual(["pressed", "click", "pressed", "click"]);
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
	it("resetGestureState discards a pending drag", () => {
		const { dispatch, recognizer, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		// Queue a move but reset before flushing
		dispatch(makeEvent("pointermove", 50, 0, 1016));
		recognizer.resetGestureState();
		flushRaf();
		// pressed is already discarded, so the following up is ignored too
		dispatch(makeEvent("pointerup", 50, 0, 1032));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("dispose cancels pending RAFs and does not fire the callback", () => {
		const { dispatch, recognizer, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000)); // Schedule one RAF
		recognizer.dispose();
		flushRaf();

		expect(cancelledIds.length).toBeGreaterThan(0);
		expect(events).toHaveLength(0);
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
