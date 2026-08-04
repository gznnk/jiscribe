import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

// DOM-layout-dependent utilities (getSvgPoint / createGetHovered, etc.) do not work in
// the node environment, so replace them with deterministic stubs to the extent needed to
// verify the ordering logic.
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

/** Allows manually flushing pending RAF callbacks */
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
				edgeScrollEnabled: false,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
		},
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
	return { events, recognizer, dispatch };
};

describe("GestureRecognizer batch ordering (#42)", () => {
	it("down->move->up within the same frame becomes a drag, not a click", () => {
		const { events, dispatch } = setup();

		// Dispatch 3 events before flushing to reproduce same-frame coalescing
		dispatch(makeEvent("pointerdown", 0, 0, 0));
		dispatch(makeEvent("pointermove", 5, 0, 8)); // 5px > DRAG_THRESHOLD(3px)
		dispatch(makeEvent("pointerup", 5, 0, 16));
		flushRaf();

		const types = events.map((e) => e.type);
		expect(types).toContain("dragStart");
		expect(types).toContain("dragEnd");
		expect(types).not.toContain("click");
		expect(types).toEqual(["pressed", "dragStart", "dragEnd"]);
	});

	it("down->up without a move (same frame) becomes a click", () => {
		const { events, dispatch } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 0));
		dispatch(makeEvent("pointerup", 0, 0, 4));
		flushRaf();

		const types = events.map((e) => e.type);
		expect(types).toEqual(["pressed", "click"]);
	});

	it("a normal drag spanning multiple frames still works", () => {
		const { events, dispatch } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 0));
		flushRaf();
		dispatch(makeEvent("pointermove", 10, 0, 16));
		flushRaf();
		dispatch(makeEvent("pointermove", 20, 0, 32));
		flushRaf();
		dispatch(makeEvent("pointerup", 20, 0, 48));
		flushRaf();

		const types = events.map((e) => e.type);
		expect(types).toEqual(["pressed", "dragStart", "drag", "dragEnd"]);
	});

	it("multiple moves in the same frame coalesce to the latest position while order is preserved", () => {
		const { events, dispatch } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 0));
		dispatch(makeEvent("pointermove", 4, 0, 4));
		dispatch(makeEvent("pointermove", 30, 0, 8)); // latest move
		dispatch(makeEvent("pointerup", 30, 0, 16));
		flushRaf();

		const dragStart = events.find((e) => e.type === "dragStart");
		const dragEnd = events.find((e) => e.type === "dragEnd");
		expect(events.map((e) => e.type)).toEqual([
			"pressed",
			"dragStart",
			"dragEnd",
		]);
		// After coalescing, dragStart fires at the latest move position (x=30)
		expect(dragStart?.last.x).toBe(30);
		expect(dragEnd?.last.x).toBe(30);
	});
});
