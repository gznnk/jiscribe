import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

// DOM レイアウト依存のユーティリティ（getSvgPoint / getHoveredElements など）は
// node 環境では動かないため、順序ロジックの検証に必要な範囲で決定的なスタブに差し替える。
vi.mock("../utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
			x: clientX,
			y: clientY,
		}),
		getKindAndId: () => ({ id: "obj-1", kind: "rect" }),
		getHoveredElements: () => [],
		getInputValue: () => undefined,
		isGestureOptedOut: () => false,
		shouldSkipPointerCapture: () => false,
		detectEdgeProximity: () => ({ isNearEdge: false }),
		calculateScrollDelta: () => ({ deltaX: 0, deltaY: 0 }),
	};
});

/** 保留中の RAF コールバックを手動で flush できるようにする */
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
	return { events, recognizer, dispatch };
};

describe("GestureRecognizer batch ordering (#42)", () => {
	it("同一フレームの down→move→up は drag として成立し、click にならない", () => {
		const { events, dispatch } = setup();

		// 3 イベントを flush 前に投入し、同一フレーム合体を再現する
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

	it("move を伴わない down→up（同一フレーム）は click になる", () => {
		const { events, dispatch } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 0));
		dispatch(makeEvent("pointerup", 0, 0, 4));
		flushRaf();

		const types = events.map((e) => e.type);
		expect(types).toEqual(["pressed", "click"]);
	});

	it("フレームをまたぐ通常ドラッグも引き続き成立する", () => {
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

	it("同一フレームに複数の move が来ても最新位置に合体し、順序は保たれる", () => {
		const { events, dispatch } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 0));
		dispatch(makeEvent("pointermove", 4, 0, 4));
		dispatch(makeEvent("pointermove", 30, 0, 8)); // 最新の move
		dispatch(makeEvent("pointerup", 30, 0, 16));
		flushRaf();

		const dragStart = events.find((e) => e.type === "dragStart");
		const dragEnd = events.find((e) => e.type === "dragEnd");
		expect(events.map((e) => e.type)).toEqual([
			"pressed",
			"dragStart",
			"dragEnd",
		]);
		// 合体後は最新 move の位置（x=30）で dragStart が発火する
		expect(dragStart?.last.x).toBe(30);
		expect(dragEnd?.last.x).toBe(30);
	});
});
