import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { VertexControlHandler } from "../../vertex/VertexControlHandler";
import { VertexInsertHandler } from "../../vertex/VertexInsertHandler";
import { ConnectionAnchorEventHandler } from "../ConnectionAnchorEventHandler";
import { ConnectorVertexInsertHandler } from "../ConnectorVertexInsertHandler";

const insertHandler = new ConnectorVertexInsertHandler();

/** supports() 検証用に targetKind / targetId だけ持つ最小イベント。 */
const controlEvent = (
	targetId: string | undefined,
	targetKind = "control",
): CanvasEvent =>
	({
		type: "dragStart",
		targetKind,
		targetId,
		button: 0,
	}) as unknown as CanvasEvent;

const makeConnector = (id: string, points: Point[]) =>
	({
		id,
		type: "connector",
		points,
		source: { owner: { type: "rect", id: "a" }, anchor: { kind: "center" } },
		target: { owner: { type: "rect", id: "b" }, anchor: { kind: "center" } },
	}) as unknown;

const makeState = (points: Point[]): CanvasControllerState => {
	const connector = makeConnector("conn-1", points);
	return {
		objects: { "conn-1": connector },
		rootIds: ["conn-1"],
		selectedIds: [],
		selectedConnectorId: "conn-1",
		selectedVertex: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "conn-1": connector },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: [],
			selectedIdsWithDescendants: new Set(),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const insertEvent = (
	type: "dragStart" | "drag" | "dragEnd",
	last: Point,
	segmentIndex: number,
	button = 0,
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: `connector-vertex-insert:conn-1:${segmentIndex}`,
		button,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const pointsOf = (state: CanvasControllerState, id = "conn-1") =>
	(state.objects[id] as unknown as { points: Point[] }).points;

describe("ConnectorVertexInsertHandler", () => {
	it("直線コネクター（waypoint なし）の唯一のセグメントに最初の曲げ点を打てる", () => {
		const state = makeState([]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		expect(pointsOf(next)).toEqual([{ x: 50, y: 50 }]);
		// 後続 drag 用に eventStartSnapshot も更新されている
		expect(pointsOf(next.eventStartSnapshot as never)).toEqual([
			{ x: 50, y: 50 },
		]);
	});

	it("セグメント番号は端点込みパス基準で、waypoints へ splice(segmentIndex) で挿入する", () => {
		// 描画パス [source, w0, w1, target] のセグメント 1 (w0→w1) に挿入
		const state = makeState([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 40 }, 1),
		);
		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 40 },
			{ x: 100, y: 0 },
		]);
	});

	it("最終セグメント（segmentIndex = waypoints.length）では末尾へ追加する", () => {
		const state = makeState([{ x: 0, y: 0 }]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 80, y: 80 }, 1),
		);
		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 80, y: 80 },
		]);
	});

	it("dragStart で挿入した点を drag で移動できる", () => {
		const started = insertHandler.handle(
			makeState([]),
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		const dragged = insertHandler.handle(
			started,
			insertEvent("drag", { x: 70, y: 90 }, 0),
		);
		expect(pointsOf(dragged)).toEqual([{ x: 70, y: 90 }]);
	});

	it("dragEnd で edgeScroll を無効化して確定する", () => {
		const started = insertHandler.handle(
			makeState([]),
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		const ended = insertHandler.handle(
			started,
			insertEvent("dragEnd", { x: 60, y: 60 }, 0),
		);
		expect(pointsOf(ended)).toEqual([{ x: 60, y: 60 }]);
		expect(ended.edgeScrollEnabled).toBe(false);
	});

	it("左クリック以外（button !== 0）は無視する", () => {
		const state = makeState([]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 0, 2),
		);
		expect(pointsOf(next)).toEqual([]);
	});

	it("コネクター以外のオブジェクトには作用しない", () => {
		const state = makeState([]);
		state.objects["conn-1"] = { id: "conn-1", type: "rect" } as never;
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		expect(next).toBe(state);
	});

	it("セグメント数を超える segmentIndex は無視する（パスは waypoints.length + 1 本）", () => {
		// waypoint 0 個 → セグメントは 1 本（index 0 のみ）。index 5 は範囲外。
		const state = makeState([]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 5),
		);
		expect(pointsOf(next)).toEqual([]);
	});
});

describe("ConnectorVertexInsertHandler.supports / ルーティング衝突", () => {
	const vertexInsert = new VertexInsertHandler();
	const connectionAnchor = new ConnectionAnchorEventHandler();

	it("connector-vertex-insert: の control イベントだけを supports する", () => {
		expect(
			insertHandler.supports(controlEvent("connector-vertex-insert:c:0")),
		).toBe(true);
		expect(insertHandler.supports(controlEvent("vertex-insert:c:0"))).toBe(
			false,
		);
		expect(
			insertHandler.supports(controlEvent("connection-anchor:edit:c:source")),
		).toBe(false);
		expect(insertHandler.supports(controlEvent(undefined))).toBe(false);
		expect(
			insertHandler.supports(
				controlEvent("connector-vertex-insert:c:0", "object"),
			),
		).toBe(false);
	});

	it("紛らわしい prefix の兄弟ハンドラは connector-vertex-insert を奪わない", () => {
		// ControlEventHandler は supports() が true の最初のストラテジへ流すため、
		// 接頭辞が部分一致する VertexInsertHandler / ConnectionAnchorEventHandler が
		// 誤って掴まないことを固定する。
		const event = controlEvent("connector-vertex-insert:c:0");
		expect(vertexInsert.supports(event)).toBe(false);
		expect(connectionAnchor.supports(event)).toBe(false);
		// 逆向き: 自分は他者のコントロールを掴まない
		expect(insertHandler.supports(controlEvent("vertex-control:c:0"))).toBe(
			false,
		);
	});
});

describe("VertexControlHandler によるコネクター waypoint 移動（流用確認）", () => {
	const moveHandler = new VertexControlHandler();

	it('"vertex-control:<connectorId>:<i>" の drag で waypoint を動かせる', () => {
		const state = makeState([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		const event = {
			type: "drag",
			targetKind: "control",
			targetId: "vertex-control:conn-1:1",
			button: 0,
			last: { x: 120, y: 40 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		} as unknown as CanvasEvent;

		const next = moveHandler.handle(state, event);
		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 120, y: 40 },
		]);
	});
});
