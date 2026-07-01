import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import { DOUBLE_CLICK_THRESHOLD } from "../GestureRecognizerConstants";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";
import type * as RecognizerUtils from "../utils";

/**
 * GestureRecognizer の振る舞い網羅テスト。
 *
 * batchOrdering / edgeScroll テストが扱わない経路を補う:
 *   - click / doubleClick の判定（しきい値・3連打抑止・ターゲット差）
 *   - マルチタッチ（2本目の pointerdown 無視）
 *   - pointercancel（ドラッグ中 dragEnd / 未ドラッグは無音）
 *   - ドラッグ外 wheel の wheel ジェスチャー化
 *   - mods / button / targetKind の透過
 *   - isGestureOptedOut による起点抑止
 *   - resetGestureState / dispose のライフサイクル
 *
 * DOM 依存ユーティリティは決定的スタブへ差し替える。getKindAndId は
 * mockUtil 経由でテストごとに戻り値（= targetId/targetKind の有無）を切り替える。
 */

const mockUtil = vi.hoisted(() => ({
	kindAndId: { id: "obj-1", kind: "rect" } as {
		id: string;
		kind: string;
	} | null,
	optedOut: false,
	inputValue: undefined as string | undefined,
}));

// DOM/レイアウト依存のユーティリティだけ決定的スタブへ差し替え、純粋ロジック
// （isDoubleClick など）は実物を使う。doubleClick の距離・時間判定を結線レベルで
// 検証したいため、ここで実装を mock してしまわないこと。
vi.mock("../utils", async (importActual) => {
	const actual = await importActual<typeof RecognizerUtils>();
	return {
		...actual,
		getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
			x: clientX,
			y: clientY,
		}),
		getKindAndId: () => mockUtil.kindAndId,
		getHoveredElements: () => [],
		getInputValue: () => mockUtil.inputValue,
		isGestureOptedOut: () => mockUtil.optedOut,
		shouldSkipPointerCapture: () => false,
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
	it("同一ターゲットへ DOUBLE_CLICK_THRESHOLD 内に 2 回クリックすると doubleClick", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 0, 0, 1100));
		dispatch(makeEvent("pointerup", 0, 0, 1100));
		flushRaf();

		expect(types()).toEqual(["pressed", "click", "pressed", "doubleClick"]);
	});

	it("しきい値を超えて間隔が空くと 2 回目も click", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 0, 0, 1000 + DOUBLE_CLICK_THRESHOLD));
		dispatch(makeEvent("pointerup", 0, 0, 1000 + DOUBLE_CLICK_THRESHOLD));
		flushRaf();

		expect(types()).toEqual(["pressed", "click", "pressed", "click"]);
	});

	it("3 連打目は doubleClick にならない（連続 doubleClick 抑止）", () => {
		const { dispatch, events } = setup();

		// 3 回連続クリック（すべて 100ms 間隔）
		for (let i = 0; i < 3; i++) {
			const t = 1000 + i * 100;
			dispatch(makeEvent("pointerdown", 0, 0, t));
			dispatch(makeEvent("pointerup", 0, 0, t));
			flushRaf();
		}

		const finals = events.filter(
			(e) => e.type === "click" || e.type === "doubleClick",
		);
		// click（1回目）→ doubleClick（2回目）→ click（3回目はリセット済みで doubleClick にならない）
		expect(finals.map((e) => e.type)).toEqual([
			"click",
			"doubleClick",
			"click",
		]);
	});

	it("ターゲットが異なれば時間内でも click のまま", () => {
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

	it("DRAG_THRESHOLD 未満の微小移動を挟んでも click として成立する", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointermove", 1, 0, 1004)); // 1px < 3px(threshold)
		dispatch(makeEvent("pointerup", 1, 0, 1008));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("背景（targetId undefined）への最初の 1 クリックは timeStamp が小さくても click", () => {
		const { dispatch, types } = setup();

		// 回帰: かつては直近クリック未記録を undefined で表していたため、targetId が
		// undefined（背景）かつ timeStamp < 閾値だと初回クリックが doubleClick に化けた。
		// lastClick=null（基準未記録）を分けたことで初回は必ず click になる。
		mockUtil.kindAndId = null;
		dispatch(makeEvent("pointerdown", 0, 0, 100));
		dispatch(makeEvent("pointerup", 0, 0, 100));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});

	it("doubleClick 成立直後の 3 連打目は背景でも click（基準リセット）", () => {
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

describe("GestureRecognizer マルチタッチ抑止", () => {
	it("ジェスチャー進行中の 2 本目 pointerdown は無視される", () => {
		const { dispatch, events, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		// 2 本目を別 pointerId で投入 → pressed は発火しない
		dispatch(makeEvent("pointerdown", 50, 50, 1010, { pointerId: 2 }));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
		// 1 本目の pressed のみ
		expect(events.filter((e) => e.type === "pressed")).toHaveLength(1);
	});

	it("2 本目ポインターの move / up も無視される", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { pointerId: 1 }));
		flushRaf();
		dispatch(makeEvent("pointerdown", 50, 50, 1010, { pointerId: 2 }));
		dispatch(makeEvent("pointermove", 90, 90, 1020, { pointerId: 2 }));
		dispatch(makeEvent("pointerup", 90, 90, 1030, { pointerId: 2 }));
		flushRaf();
		// 1 本目を離すと click として成立する（2本目に汚染されていない）
		dispatch(makeEvent("pointerup", 0, 0, 1040, { pointerId: 1 }));
		flushRaf();

		expect(types()).toEqual(["pressed", "click"]);
	});
});

describe("GestureRecognizer pointercancel", () => {
	it("ドラッグ中の pointercancel は dragEnd で締める", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointermove", 20, 0, 1016));
		flushRaf();
		dispatch(makeEvent("pointercancel", 20, 0, 1032));
		flushRaf();

		expect(types()).toEqual(["pressed", "dragStart", "dragEnd"]);
	});

	it("未ドラッグの pointercancel は何も発火しない（click にもならない）", () => {
		const { dispatch, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointercancel", 0, 0, 1016));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("pointercancel 後は pressed が破棄され、続く up は無視される", () => {
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

describe("GestureRecognizer wheel（ドラッグ外）", () => {
	it("ドラッグ外 wheel は wheel ジェスチャーになり targetId が canvas へ固定される", () => {
		const { wheelHandler, events } = setup();

		wheelHandler(makeWheelEvent(100, 200, 5, -12, 1000));
		flushRaf();

		expect(events).toHaveLength(1);
		const wheel = events[0];
		expect(wheel.type).toBe("wheel");
		expect(wheel.targetId).toBe("canvas");
		expect(wheel.targetKind).toBe("canvas");
		expect(wheel.scrollDelta).toEqual({ deltaX: 5, deltaY: -12 });
		// wheel はカーソル位置を start/last に据え、delta は 0
		expect(wheel.start).toEqual({ x: 100, y: 200 });
		expect(wheel.delta).toEqual({ x: 0, y: 0 });
	});
});

describe("GestureRecognizer ドラッグ中 wheel → スクロール", () => {
	it("ドラッグ中の wheel は drag の scrollDelta として合流する", () => {
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

describe("GestureRecognizer 透過プロパティ（mods / button / targetKind）", () => {
	it("修飾キーが pressed に透過される", () => {
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

	it("button（右クリック=2）が一連のジェスチャーへ透過される", () => {
		const { dispatch, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000, { button: 2 }));
		flushRaf();
		dispatch(makeEvent("pointerup", 0, 0, 1000, { button: 2 }));
		flushRaf();

		for (const e of events) {
			expect(e.button).toBe(2);
		}
	});

	it("targetKind が pressed に透過される", () => {
		const { dispatch, events } = setup();

		mockUtil.kindAndId = { id: "node-7", kind: "ellipse" };
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();

		expect(events[0].targetId).toBe("node-7");
		expect(events[0].targetKind).toBe("ellipse");
	});
});

describe("GestureRecognizer isGestureOptedOut", () => {
	it("opt-out 要素由来の pointerdown は起点にならない", () => {
		const { dispatch, events } = setup();

		mockUtil.optedOut = true;
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();

		expect(events).toHaveLength(0);
	});
});

describe("GestureRecognizer ライフサイクル", () => {
	it("resetGestureState は保留中のドラッグを破棄する", () => {
		const { dispatch, recognizer, types } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		flushRaf();
		// move をキューに積むが flush 前にリセット
		dispatch(makeEvent("pointermove", 50, 0, 1016));
		recognizer.resetGestureState();
		flushRaf();
		// pressed は破棄済みなので後続 up も無視される
		dispatch(makeEvent("pointerup", 50, 0, 1032));
		flushRaf();

		expect(types()).toEqual(["pressed"]);
	});

	it("dispose は保留中の RAF をキャンセルしコールバックを発火させない", () => {
		const { dispatch, recognizer, events } = setup();

		dispatch(makeEvent("pointerdown", 0, 0, 1000)); // RAF を 1 つ予約
		recognizer.dispose();
		flushRaf();

		expect(cancelledIds.length).toBeGreaterThan(0);
		expect(events).toHaveLength(0);
	});
});

// しきい値の境界精度は isDoubleClick の solitary テストが担保する。ここでは
// recognizer が pointerdown 位置を正しくスナップショットして判定に渡せているか
// （= パイプラインの結線）を、近い／遠いの代表ケースで確認する。
describe("GestureRecognizer doubleClick 距離しきい値（結線）", () => {
	const finalsOf = (events: Gesture[]) =>
		events
			.filter((e) => e.type === "click" || e.type === "doubleClick")
			.map((e) => e.type);

	it("時間内でも大きく離れて再クリックすると別 click", () => {
		const { dispatch, events } = setup();

		// 同一ターゲット・時間内だが、2 クリックが大きく離れている。
		dispatch(makeEvent("pointerdown", 0, 0, 1000));
		dispatch(makeEvent("pointerup", 0, 0, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 100, 0, 1100));
		dispatch(makeEvent("pointerup", 100, 0, 1100));
		flushRaf();

		expect(finalsOf(events)).toEqual(["click", "click"]);
	});

	it("背景（targetId undefined）でも距離が近ければ doubleClick になる", () => {
		const { dispatch, events } = setup();

		mockUtil.kindAndId = null;
		dispatch(makeEvent("pointerdown", 200, 200, 1000));
		dispatch(makeEvent("pointerup", 200, 200, 1000));
		flushRaf();
		dispatch(makeEvent("pointerdown", 202, 201, 1100)); // 距離 √5 < 5px
		dispatch(makeEvent("pointerup", 202, 201, 1100));
		flushRaf();

		expect(finalsOf(events)).toEqual(["click", "doubleClick"]);
	});

	it("回帰: 別位置の 2 連続背景クリックは doubleClick に合体しない", () => {
		const { dispatch, events } = setup();

		// targetId は両方 undefined だが、位置が大きく離れているため距離判定で別 click。
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
