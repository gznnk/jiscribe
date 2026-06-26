import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestureRecognizer } from "../GestureRecognizer";
import type {
	Gesture,
	GestureRecognizerConfig,
} from "../GestureRecognizerTypes";

/**
 * Issue #72 の検証テスト。
 *
 * エッジスクロール中、recognizer は `currentPos`（= drag.last）に生ピクセルの
 * scrollDelta を、`delta` には scrollDelta/zoom を加算する（GestureRecognizer.ts:346-349）。
 * このテストは実機の 1 フレームループを忠実に再現し、`event.last` が
 * 「描画されるカーソルのワールド座標」からどれだけズレるかを毎フレーム実測する。
 *
 * 再現する実機ループ:
 *   1. recognizer が getSvgPoint（= getScreenCTM 逆変換）で現 viewport を反映した
 *      カーソルのワールド座標を得る。
 *   2. drag を発火（last / delta / scrollDelta）。
 *   3. CanvasEventHandler が scroll 派生イベントで viewport.minX += scrollDelta/zoom。
 *   4. 次フレームの getSvgPoint は更新後 viewport を反映する。
 *
 * sim.viewport を getSvgPoint モックと canvasStateRef で共有し、各フレーム後に
 * reducer 相当の viewport 更新を手で行うことで上記を再現する。
 */

const STEP = 10; // AUTO_SCROLL_STEP_SIZE 相当（px）
const CLIENT_X = 790; // 端で静止させるカーソルのクライアント X（右端近傍・不変）
// 武装（arm-on-leave）用の内部クライアント X。ここから掴むと開始点はエッジ外。
const CLIENT_X_INTERIOR = 400;

// getSvgPoint モックと canvasStateRef が共有する可変 viewport。
const sim = vi.hoisted(() => ({
	viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 2 },
}));

vi.mock("../utils", () => ({
	// viewBox = `minX minY width/zoom height/zoom` を画面サイズ width×height に描く際の
	// getScreenCTM 逆変換: world = minX + clientX / zoom。viewport を反映する点が肝。
	getSvgPoint: (_svg: unknown, clientX: number, clientY: number) => ({
		x: sim.viewport.minX + clientX / sim.viewport.zoom,
		y: sim.viewport.minY + clientY / sim.viewport.zoom,
	}),
	getKindAndId: () => ({ id: "obj-1", kind: "rect" }),
	getHoveredElements: () => [],
	getInputValue: () => undefined,
	isGestureOptedOut: () => false,
	shouldSkipPointerCapture: () => false,
	// 位置依存の近接判定。右端から AUTO_SCROLL_THRESHOLD(=20px) 以内を near とする。
	// 内部（左寄り）では near=false になり、arm-on-leave の武装を再現できる。
	detectEdgeProximity: (
		vp: { minX: number; width: number; zoom: number },
		svgX: number,
	) => {
		const rightWorld = vp.minX + vp.width / vp.zoom;
		const isNearEdge = rightWorld - svgX < 20 / vp.zoom;
		return {
			isNearEdge,
			horizontal: isNearEdge ? ("right" as const) : null,
			vertical: null,
		};
	},
	calculateScrollDelta: () => ({ deltaX: STEP, deltaY: 0 }),
}));

let rafCallbacks: FrameRequestCallback[] = [];

const flushRaf = (): void => {
	// 退避してから実行する。flush 中の enqueue/schedule は次フレーム分として
	// 新しい rafCallbacks に積まれ、この呼び出しでは実行されない（= 1 flush = 1 フレーム）。
	const pending = rafCallbacks;
	rafCallbacks = [];
	for (const cb of pending) {
		cb(performance.now());
	}
};

beforeEach(() => {
	rafCallbacks = [];
	sim.viewport = { minX: 0, minY: 0, width: 800, height: 600, zoom: 2 };
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
				edgeScrollEnabled: true,
				// getSvgPoint と同じ可変 viewport を参照させる（zoom / minX を共有）。
				viewport: sim.viewport,
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
		}
	};
	return { events, dispatch, wheelHandler };
};

type Sample = {
	/** recognizer が出した drag.last.x（ハンドラがカーソル位置として消費する値） */
	lastX: number;
	/** recognizer が出した drag.delta.x */
	deltaX: number;
	/** drag.start.x（ドラッグ開始時のワールド座標・不変） */
	startX: number;
	/** この drag に伴いビューポートが scrollDelta/zoom だけ動いた後に、
	 *  固定クライアント座標のカーソルが描画されるワールド座標 */
	cursorWorldWhenPainted: number;
};

/**
 * pointerdown → 端へドラッグ開始 → 端で静止したままエッジスクロールを N フレーム回し、
 * 各フレームの drag を実機ループ（drag 消費 → viewport 更新）として記録する。
 */
const runEdgeScroll = (frames: number): Sample[] => {
	const { events, dispatch } = setup();
	const { zoom } = sim.viewport;

	// pressed（内部）
	dispatch(makeEvent("pointerdown", CLIENT_X_INTERIOR, 100, 0));
	flushRaf();

	// ドラッグ開始（しきい値超え・内部）。dragStart にはまだ scrollDelta は適用されない。
	dispatch(makeEvent("pointermove", CLIENT_X_INTERIOR + 20, 100, 16));
	flushRaf();

	// 内部で 1 drag。エッジ外なので edgeScrollArmed が立つ（武装）。
	dispatch(makeEvent("pointermove", CLIENT_X_INTERIOR + 40, 100, 24));
	flushRaf();

	// 端で静止したまま最初の drag を 1 つ流す。以降は enqueue が自走するので
	// flushRaf を繰り返すだけで毎フレームのエッジスクロールが続く。
	dispatch(makeEvent("pointermove", CLIENT_X, 100, 32));

	const samples: Sample[] = [];
	let seen = events.filter((e) => e.type === "drag").length;

	for (let i = 0; i < frames; i++) {
		flushRaf();
		const drags = events.filter((e) => e.type === "drag");
		const drag = drags[drags.length - 1];
		if (!drag || drags.length === seen) {
			break;
		}
		seen = drags.length;

		const scrollDeltaX = drag.scrollDelta?.deltaX ?? 0;
		// reducer 相当: ビューポートを scrollDelta/zoom だけ動かす（CanvasEventHandler.ts:65）。
		sim.viewport.minX += scrollDeltaX / zoom;

		samples.push({
			lastX: drag.last.x,
			deltaX: drag.delta.x,
			startX: drag.start.x,
			cursorWorldWhenPainted: sim.viewport.minX + CLIENT_X / zoom,
		});
	}

	return samples;
};

/**
 * pointerdown → ドラッグ開始 → 端で静止したまま「ドラッグ中の wheel スクロール」を
 * N フレーム回す（isWheel 分岐: GestureRecognizer.ts:312-322）。
 * wheel 経路は enqueue で自走しないため、各フレームで wheel を 1 回ずつ流す。
 */
const runWheelScroll = (frames: number): Sample[] => {
	const { events, dispatch, wheelHandler } = setup();
	const { zoom } = sim.viewport;

	dispatch(makeEvent("pointerdown", 200, 100, 0));
	flushRaf();
	// ドラッグ開始（dragging=true）。toWheelEvent は dragging 中のみ pointermove 化する。
	dispatch(makeEvent("pointermove", CLIENT_X, 100, 16));
	flushRaf();

	const samples: Sample[] = [];
	let seen = events.filter((e) => e.type === "drag").length;
	let t = 32;

	for (let i = 0; i < frames; i++) {
		// 端で静止したカーソル上でホイールを回す（deltaX = STEP）。
		wheelHandler({
			clientX: CLIENT_X,
			clientY: 100,
			deltaX: STEP,
			deltaY: 0,
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			target: {} as EventTarget,
			timeStamp: t,
		} as never);
		t += 16;
		flushRaf();

		const drags = events.filter((e) => e.type === "drag");
		const drag = drags[drags.length - 1];
		if (!drag || drags.length === seen) {
			break;
		}
		seen = drags.length;

		const scrollDeltaX = drag.scrollDelta?.deltaX ?? 0;
		sim.viewport.minX += scrollDeltaX / zoom;

		samples.push({
			lastX: drag.last.x,
			deltaX: drag.delta.x,
			startX: drag.start.x,
			cursorWorldWhenPainted: sim.viewport.minX + CLIENT_X / zoom,
		});
	}

	return samples;
};

describe("GestureRecognizer スクロール中の drag.last（#72 回帰 / エッジ・ホイール共通）", () => {
	// 修正前: currentPos に生ピクセル scrollDelta を加算していたため、last は
	// カーソル描画位置から定数 s−s/zoom（zoom2 で 5 ワールド単位 = 10px）先行していた。
	// Transform/Vertex/範囲選択は last を直接カーソル位置として使うため、この先行が
	// 画面上のズレとして現れていた（#72）。修正後は last が /zoom 揃えになり 0 になる。
	it("zoom≠1: last はカーソル描画位置に一致する（先行オフセットが無い）", () => {
		const samples = runEdgeScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);

		for (const s of samples) {
			expect(s.lastX - s.cursorWorldWhenPainted).toBeCloseTo(0);
		}
	});

	it("last の毎フレーム伸びは s/zoom（= 実ビューポート移動量）であり zoom 倍速ではない", () => {
		const samples = runEdgeScroll(6);
		const zoom = 2;

		for (let i = 1; i < samples.length; i++) {
			const growth = samples[i].lastX - samples[i - 1].lastX;
			// issue 主張の「zoom 倍速（= STEP）」ではなく STEP/zoom で進む。
			expect(growth).toBeCloseTo(STEP / zoom);
			expect(growth).not.toBeCloseTo(STEP);
		}
	});

	it("不変条件 last === start + delta が保たれる", () => {
		const samples = runEdgeScroll(6);

		for (const s of samples) {
			expect(s.lastX - (s.startX + s.deltaX)).toBeCloseTo(0);
		}
	});

	it("zoom=1: オフセットは 0 で不変条件も保たれる", () => {
		sim.viewport.zoom = 1;
		const samples = runEdgeScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);

		for (const s of samples) {
			expect(s.lastX - s.cursorWorldWhenPainted).toBeCloseTo(0);
			expect(s.lastX - (s.startX + s.deltaX)).toBeCloseTo(0);
		}
	});

	// 344-350 のブロックは isWheel 分岐（ドラッグ中のホイール）とエッジスクロールの
	// 共通合流点。ホイール経路でも先行オフセットが無いことを確認する。
	it("ドラッグ中ホイールでもエッジスクロールと同一: last がカーソルに一致する", () => {
		const samples = runWheelScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);

		const zoom = 2;

		for (const s of samples) {
			expect(s.lastX - s.cursorWorldWhenPainted).toBeCloseTo(0);
			expect(s.lastX - (s.startX + s.deltaX)).toBeCloseTo(0);
		}

		// 毎フレームの伸びは s/zoom（zoom 倍速ではない）。
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i].lastX - samples[i - 1].lastX).toBeCloseTo(STEP / zoom);
		}
	});
});

describe("GestureRecognizer arm-on-leave（端に接した UI から掴んだ直後の暴発防止）", () => {
	// ShapeLibrary など端に接した UI から掴むと、開始点が必ずエッジゾーン内になる。
	// 一度もエッジ外へ出ていない間はスクロールを発火させない。
	it("開始時エッジゾーン内のまま動かしてもスクロールしない", () => {
		const { events, dispatch } = setup();

		// 端（clientX=800）で掴み、エッジゾーン内（clientX>780）に留まったまま動かす。
		// ドラッグ閾値は超えるがゾーン外へは出ない。
		dispatch(makeEvent("pointerdown", 800, 100, 0));
		flushRaf();
		dispatch(makeEvent("pointermove", 786, 100, 16)); // dragStart（端のまま）
		flushRaf();
		dispatch(makeEvent("pointermove", 795, 100, 32)); // drag（端のまま）
		flushRaf();
		// 自走していれば追加フレームでスクロールが続くはずだが、未武装なので何も起きない。
		flushRaf();
		flushRaf();

		const drags = events.filter((e) => e.type === "drag");
		expect(drags.length).toBeGreaterThan(0);
		for (const drag of drags) {
			expect(drag.scrollDelta).toBeUndefined();
		}
	});

	// 一度エッジ外へ出れば武装され、その後エッジに触れるとスクロールが始まる。
	it("一度内部へ出てから端へ戻るとスクロールが始まる", () => {
		// runEdgeScroll は内部で 1 drag 挟んでから端へ移動する経路を辿る。
		const samples = runEdgeScroll(6);
		expect(samples.length).toBeGreaterThanOrEqual(4);
		expect(samples[0].deltaX).not.toBe(0);
	});
});
