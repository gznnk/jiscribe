// @vitest-environment jsdom

import { act } from "react";
import type * as ReactDom from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCommandState } from "../../commands/__tests__/support/createCommandState";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import type * as RecognizerTargeting from "../../gestures/recognizer/targeting";
import type * as RecognizerUtils from "../../gestures/recognizer/utils";
import type { CanvasAction } from "../../reducer/CanvasActions";
import {
	FRAME_COMMIT_SCHEDULER_MARK,
	FRAME_COMMIT_SYNC_MARK,
	useGestureRecognizer,
	type UseGestureRecognizerReturn,
} from "../useGestureRecognizer";
import {
	IDLE_RESET_MS,
	OVER_BUDGET_FRAMES_TO_FALL_BACK,
	SYNC_COMMIT_BUDGET_MS,
} from "../utils/createAdaptiveFrameCommit";

/**
 * The gestures a recognizer frame dispatches are committed inside `flushSync`, so
 * they land in the frame that processed the input rather than after its paint.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// Set while the (real) flushSync is running its callback.
let isInsideFlushSync = false;

vi.mock("react-dom", async (importActual) => {
	const actual = await importActual<typeof ReactDom>();
	return {
		...actual,
		flushSync: vi.fn(<R,>(callback: () => R): R => {
			isInsideFlushSync = true;
			try {
				return actual.flushSync(callback);
			} finally {
				isInsideFlushSync = false;
			}
		}),
	};
});

// The recognizer's DOM-layout utilities need a laid-out SVG; stub them as the
// recognizer's own tests do.
vi.mock("../../gestures/recognizer/targeting", async (importActual) => {
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

vi.mock("../../gestures/recognizer/utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getWorldPoint: (
			_svg: unknown,
			_viewport: unknown,
			clientX: number,
			clientY: number,
		) => ({ x: clientX, y: clientY }),
		detectEdgeProximity: () => ({ isNearEdge: false }),
		calculateScrollDelta: () => ({ deltaX: 0, deltaY: 0 }),
	};
});

let rafCallbacks: FrameRequestCallback[] = [];

const flushRaf = (): void => {
	const pending = rafCallbacks;
	rafCallbacks = [];
	for (const callback of pending) {
		callback(performance.now());
	}
};

const roots: { unmount: () => void }[] = [];

beforeEach(async () => {
	rafCallbacks = [];
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
		rafCallbacks.push(cb);
		return rafCallbacks.length;
	});
	vi.stubGlobal("cancelAnimationFrame", (): void => {});
	const { flushSync } = await import("react-dom");
	vi.mocked(flushSync).mockClear();
});

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const mountRecognizer = () => {
	// Whether each dispatched action ran inside flushSync, in dispatch order.
	const dispatchedInsideFlushSync: boolean[] = [];
	const dispatchedActions: CanvasAction[] = [];
	const dispatch = (action: CanvasAction): void => {
		dispatchedActions.push(action);
		dispatchedInsideFlushSync.push(isInsideFlushSync);
	};
	let returned: UseGestureRecognizerReturn | null = null;

	const Probe = () => {
		returned = useGestureRecognizer({
			dispatch,
			containerRef: { current: null },
			svgRef: { current: null },
			canvasState: createCommandState(twoRectsWithConnectorDoc),
			gestureHandling: "greedy",
		});
		return null;
	};

	const root = createRoot(document.createElement("div"));
	roots.push(root);
	act(() => {
		root.render(<Probe />);
	});

	return {
		dispatchedActions,
		dispatchedInsideFlushSync,
		recognizer: returned as unknown as UseGestureRecognizerReturn,
	};
};

const createMousePointerEvent = (
	type: "pointerdown" | "pointermove",
	clientX: number,
	timeStamp: number,
) =>
	({
		type,
		pointerId: 1,
		pointerType: "mouse",
		clientX,
		clientY: 10,
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		target: document.createElement("div"),
		timeStamp,
		button: 0,
	}) as never;

describe("useGestureRecognizer", () => {
	it("dispatches a frame's gestures inside flushSync", async () => {
		const { flushSync } = await import("react-dom");
		const { dispatchedActions, dispatchedInsideFlushSync, recognizer } =
			mountRecognizer();

		recognizer.pointerHandlers.onPointerDown(
			createMousePointerEvent("pointerdown", 10, 0),
		);
		expect(dispatchedActions).toHaveLength(0);

		flushRaf();

		expect(flushSync).toHaveBeenCalledTimes(1);
		expect(dispatchedActions.map((action) => action.type)).toEqual(["GESTURE"]);
		expect(dispatchedInsideFlushSync).toEqual([true]);
	});

	it("stops wrapping frames in flushSync once consecutive frames run over budget, returns after an idle gap, and marks both switches", async () => {
		const { flushSync } = await import("react-dom");
		// Every clock read advances past the budget, so every measured commit is over it
		// while the gap between frames stays far below the idle threshold.
		let clockMs = 0;
		let clockStepMs = SYNC_COMMIT_BUDGET_MS + 1;
		vi.spyOn(performance, "now").mockImplementation(
			() => (clockMs += clockStepMs),
		);
		const markSpy = vi
			.spyOn(performance, "mark")
			.mockImplementation(() => undefined as never);
		const { dispatchedActions, dispatchedInsideFlushSync, recognizer } =
			mountRecognizer();

		recognizer.pointerHandlers.onPointerDown(
			createMousePointerEvent("pointerdown", 10, 0),
		);
		flushRaf();
		for (let frame = 1; frame < OVER_BUDGET_FRAMES_TO_FALL_BACK; frame++) {
			recognizer.pointerHandlers.onPointerMove(
				createMousePointerEvent("pointermove", 10 + frame * 20, frame * 16),
			);
			flushRaf();
		}
		expect(flushSync).toHaveBeenCalledTimes(OVER_BUDGET_FRAMES_TO_FALL_BACK);
		expect(markSpy).toHaveBeenCalledExactlyOnceWith(
			FRAME_COMMIT_SCHEDULER_MARK,
		);
		const actionCountBeforeFallBackFrame = dispatchedActions.length;

		recognizer.pointerHandlers.onPointerMove(
			createMousePointerEvent("pointermove", 200, 200),
		);
		act(() => {
			flushRaf();
		});

		expect(flushSync).toHaveBeenCalledTimes(OVER_BUDGET_FRAMES_TO_FALL_BACK);
		const fallBackFrameActions = dispatchedActions.slice(
			actionCountBeforeFallBackFrame,
		);
		expect(fallBackFrameActions.length).toBeGreaterThan(0);
		expect(
			fallBackFrameActions.every((action) => action.type === "GESTURE"),
		).toBe(true);
		expect(
			dispatchedInsideFlushSync.slice(actionCountBeforeFallBackFrame),
		).toEqual(fallBackFrameActions.map(() => false));

		// An idle gap, then a frame that costs nothing: back to synchronous commits.
		clockMs += IDLE_RESET_MS + 1;
		clockStepMs = 0;
		const actionCountBeforeIdleResetFrame = dispatchedActions.length;

		recognizer.pointerHandlers.onPointerMove(
			createMousePointerEvent("pointermove", 220, 600),
		);
		flushRaf();

		expect(markSpy).toHaveBeenLastCalledWith(FRAME_COMMIT_SYNC_MARK);
		expect(markSpy).toHaveBeenCalledTimes(2);
		expect(flushSync).toHaveBeenCalledTimes(
			OVER_BUDGET_FRAMES_TO_FALL_BACK + 1,
		);
		const idleResetFrameActions = dispatchedActions.slice(
			actionCountBeforeIdleResetFrame,
		);
		expect(idleResetFrameActions.length).toBeGreaterThan(0);
		expect(
			idleResetFrameActions.every((action) => action.type === "GESTURE"),
		).toBe(true);
		expect(
			dispatchedInsideFlushSync.slice(actionCountBeforeIdleResetFrame),
		).toEqual(idleResetFrameActions.map(() => true));
	});
});
