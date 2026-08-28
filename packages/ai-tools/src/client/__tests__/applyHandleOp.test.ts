import { describe, expect, it } from "vitest";

import { MAX_SVG_CHARS } from "../../canvasOps";
import { applyHandleOp } from "../applyHandleOp";
import type { AiHandleControl } from "../types";

/** 呼ばれた内容を控える窓口。返り値だけテストごとに差し替える */
const createFakeHandleControl = (
	overrides: Partial<AiHandleControl> = {},
): AiHandleControl => ({
	isAvailable: () => true,
	selectObjects: (ids) => ({ selectedIds: ids, ignoredIds: [] }),
	getSelectedIds: () => [],
	centerView: (point, zoom) => ({
		minX: point.x,
		minY: point.y,
		zoom: zoom ?? 1,
	}),
	setView: (camera) => camera,
	getView: () => ({
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		visibleWorldRect: { x: 0, y: 0, width: 800, height: 600 },
	}),
	fitView: () => ({ minX: 0, minY: 0, zoom: 1 }),
	fitViewToRect: () => ({ minX: 0, minY: 0, zoom: 1 }),
	measureText: () => null,
	findOverlaps: () => [],
	measureConnectorPath: () => null,
	measureVisualBounds: () => null,
	hitTest: () => [],
	toSvgString: () => "<svg></svg>",
	getInteractionStatus: () => ({
		drag: null,
		isInertialScrolling: false,
		editingTextId: null,
		drawingShapeType: null,
		modal: null,
		isBusy: false,
	}),
	toWorld: () => null,
	toClient: () => null,
	...overrides,
});

describe("applyHandleOp", () => {
	it("キャンバスが出ていなければ失敗として返す", () => {
		const result = applyHandleOp(
			{ kind: "fitView", target: "all" },
			createFakeHandleControl({ isAvailable: () => false }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("no canvas");
	});

	it("選択した id を結果に並べる", () => {
		const result = applyHandleOp(
			{ kind: "selectObjects", ids: ["rect-1", "rect-2"] },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toBe('selected "rect-1", "rect-2"');
	});

	it("選べなかった id を理由つきで添える", () => {
		const result = applyHandleOp(
			{ kind: "selectObjects", ids: ["rect-1", "gone"] },
			createFakeHandleControl({
				selectObjects: () => ({
					selectedIds: ["rect-1"],
					ignoredIds: ["gone"],
				}),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain('"gone"');
	});

	it("1 つも選べなければ失敗として返す", () => {
		const result = applyHandleOp(
			{ kind: "selectObjects", ids: ["gone"] },
			createFakeHandleControl({
				selectObjects: () => ({ selectedIds: [], ignoredIds: ["gone"] }),
			}),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain('"gone"');
	});

	it("空配列は選択解除として成功する", () => {
		const result = applyHandleOp(
			{ kind: "selectObjects", ids: [] },
			createFakeHandleControl(),
		);

		expect(result).toEqual({ ok: true, text: "cleared the selection" });
	});

	it("centerView は適用後のカメラを数値で返す", () => {
		const result = applyHandleOp(
			{ kind: "centerView", x: 100, y: 200, zoom: 2 },
			createFakeHandleControl({
				centerView: () => ({ minX: 50, minY: 100, zoom: 2 }),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("(100, 200)");
		expect(result.text).toContain("(50, 100)");
		expect(result.text).toContain("200% zoom");
	});

	it("フィットする対象が無ければ、どちらの対象かを添えて失敗させる", () => {
		const handleControl = createFakeHandleControl({ fitView: () => null });

		const all = applyHandleOp(
			{ kind: "fitView", target: "all" },
			handleControl,
		);
		const selection = applyHandleOp(
			{ kind: "fitView", target: "selection" },
			handleControl,
		);

		expect(all.ok).toBe(false);
		expect(all.text).toContain("empty");
		expect(selection.ok).toBe(false);
		expect(selection.text).toContain("nothing is selected");
	});

	it("fitView は対象を渡す", () => {
		const receivedTargets: string[] = [];
		const handleControl = createFakeHandleControl({
			fitView: (target) => {
				receivedTargets.push(target);
				return { minX: 0, minY: 0, zoom: 0.5 };
			},
		});

		const result = applyHandleOp(
			{ kind: "fitView", target: "selection" },
			handleControl,
		);

		expect(receivedTargets).toEqual(["selection"]);
		expect(result.text).toContain("the selection");
		expect(result.text).toContain("50% zoom");
	});
});

describe("applyHandleOp（計測）", () => {
	it("収まっているテキストは寸法と行数を返す", () => {
		const result = applyHandleOp(
			{ kind: "measureText", id: "rect-1" },
			createFakeHandleControl({
				measureText: () => ({
					slotId: "body",
					bounds: { x: 10, y: 20, width: 120, height: 40 },
					textSize: { width: 96, height: 36 },
					regionSize: { width: 120, height: 40 },
					lineCount: 2,
					isOverflowing: false,
				}),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain('text slot "body" of "rect-1"');
		expect(result.text).toContain("2 line(s)");
		expect(result.text).toContain("96 x 36 px");
		expect(result.text).toContain("120 x 40 px");
		expect(result.text).toContain("(10, 20)");
		expect(result.text).toContain("it fits");
	});

	it("はみ出したテキストは足りない量と直し方を返す", () => {
		const result = applyHandleOp(
			{ kind: "measureText", id: "rect-1" },
			createFakeHandleControl({
				measureText: () => ({
					slotId: "body",
					bounds: { x: 10, y: 20, width: 120, height: 40 },
					textSize: { width: 180, height: 54 },
					regionSize: { width: 120, height: 40 },
					lineCount: 3,
					isOverflowing: true,
				}),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("clipping");
		expect(result.text).toContain("60 px of width and 14 px of height");
		expect(result.text).toContain("resize_object");
		expect(result.text).toContain("fontSize");
		expect(result.text).toContain("set_text");
	});

	it("測れる対象が無いテキストは、理由を並べて失敗させる", () => {
		const result = applyHandleOp(
			{ kind: "measureText", id: "gone", slot: "title" },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain('"gone"');
		expect(result.text).toContain('slot "title"');
		expect(result.text).toContain("describe_canvas");
	});

	it("重なりは組・矩形・包含の別を添えて返す", () => {
		const result = applyHandleOp(
			{ kind: "findOverlaps" },
			createFakeHandleControl({
				findOverlaps: () => [
					{
						ids: ["box-a", "box-b"],
						overlap: { x: 30, y: 40, width: 50, height: 20 },
						covers: null,
					},
					{
						ids: ["frame", "box-c"],
						overlap: { x: 0, y: 0, width: 40, height: 10 },
						covers: "first",
					},
				],
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("2 overlapping pair(s)");
		expect(result.text).toContain(
			'"box-a" and "box-b" share (30, 40) 50 x 20 px',
		);
		expect(result.text).toContain("usually a layout mistake");
		expect(result.text).toContain('"frame" contains the other entirely');
		expect(result.text).toContain("translate_objects");
	});

	it("重なり 0 件は成功として返し、比べていない相手を添える", () => {
		const all = applyHandleOp(
			{ kind: "findOverlaps" },
			createFakeHandleControl(),
		);
		const named = applyHandleOp(
			{ kind: "findOverlaps", ids: ["box-a", "box-b"] },
			createFakeHandleControl(),
		);

		expect(all.ok).toBe(true);
		expect(all.text).toContain("no two shapes on the canvas overlap");
		expect(all.text).toContain("connectors and groups");
		expect(named.ok).toBe(true);
		expect(named.text).toContain(
			"none of the 2 shape(s) named overlaps another",
		);
		expect(named.text).toContain("check the ids");
	});

	it("コネクターの経路は頂点列を順に返す", () => {
		const result = applyHandleOp(
			{ kind: "measureConnectorPath", id: "c-1" },
			createFakeHandleControl({
				measureConnectorPath: () => [
					{ x: 10, y: 20 },
					{ x: 60, y: 20 },
					{ x: 60, y: 90 },
				],
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("3 point(s)");
		expect(result.text).toContain("(10, 20) -> (60, 20) -> (60, 90)");
	});

	it("辿れないコネクターは理由を並べて失敗させる", () => {
		const result = applyHandleOp(
			{ kind: "measureConnectorPath", id: "rect-1" },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain('"rect-1"');
		expect(result.text).toContain("not a connector");
	});

	it("描画範囲は右端・下端まで添えて返す", () => {
		const result = applyHandleOp(
			{ kind: "measureVisualBounds", ids: ["box-a", "box-b"] },
			createFakeHandleControl({
				measureVisualBounds: () => ({ x: 10, y: 20, width: 300, height: 140 }),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain(
			'"box-a", "box-b" draw within (10, 20) 300 x 140 px',
		);
		expect(result.text).toContain("right edge is x 310");
		expect(result.text).toContain("bottom edge y 160");
	});

	it("描画範囲が取れなければ失敗として返す", () => {
		const result = applyHandleOp(
			{ kind: "measureVisualBounds", ids: ["gone"] },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain('"gone"');
		expect(result.text).toContain("none of those ids is on the canvas");
	});

	it("計測もキャンバスが出ていなければ失敗として返す", () => {
		const result = applyHandleOp(
			{ kind: "findOverlaps" },
			createFakeHandleControl({ isAvailable: () => false }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("no canvas");
	});
});

describe("applyHandleOp（表示の読み書き）", () => {
	it("getView はカメラ・画面の大きさ・可視範囲を返す", () => {
		const result = applyHandleOp(
			{ kind: "getView" },
			createFakeHandleControl({
				getView: () => ({
					viewport: { minX: -50, minY: 20, width: 800, height: 600, zoom: 2 },
					visibleWorldRect: { x: -50, y: 20, width: 400, height: 300 },
				}),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("starts at (-50, 20)");
		expect(result.text).toContain("200% zoom");
		expect(result.text).toContain("800 x 600 screen px");
		expect(result.text).toContain("(-50, 20) 400 x 300 px");
		expect(result.text).toContain("right edge is x 350");
		expect(result.text).toContain("set_view");
	});

	it("setView は渡したカメラをそのまま適用する", () => {
		const receivedCameras: unknown[] = [];
		const result = applyHandleOp(
			{ kind: "setView", minX: 100, minY: 200, zoom: 0.5 },
			createFakeHandleControl({
				setView: (camera) => {
					receivedCameras.push(camera);
					return camera;
				},
			}),
		);

		expect(receivedCameras).toEqual([{ minX: 100, minY: 200, zoom: 0.5 }]);
		expect(result.ok).toBe(true);
		expect(result.text).toContain("starts at (100, 200)");
		expect(result.text).toContain("50% zoom");
	});

	it("fitView は矩形も受け、合わせた矩形と実際の可視範囲が別であることを添える", () => {
		const receivedRects: unknown[] = [];
		const result = applyHandleOp(
			{ kind: "fitView", rect: { x: 0, y: 0, width: 400, height: 300 } },
			createFakeHandleControl({
				fitViewToRect: (rect) => {
					receivedRects.push(rect);
					return { minX: -20, minY: 0, zoom: 1 };
				},
			}),
		);

		expect(receivedRects).toEqual([{ x: 0, y: 0, width: 400, height: 300 }]);
		expect(result.ok).toBe(true);
		expect(result.text).toContain("(0, 0) 400 x 300 px");
		expect(result.text).toContain("get_view");
	});

	it("広がりの無い矩形は失敗として返す", () => {
		const result = applyHandleOp(
			{ kind: "fitView", rect: { x: 10, y: 10, width: 0, height: 0 } },
			createFakeHandleControl({ fitViewToRect: () => null }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("no extent");
	});

	it("fitView は target と rect の両方・どちらも無しを弾く", () => {
		const handleControl = createFakeHandleControl();

		const both = applyHandleOp(
			{
				kind: "fitView",
				target: "all",
				rect: { x: 0, y: 0, width: 10, height: 10 },
			},
			handleControl,
		);
		const neither = applyHandleOp({ kind: "fitView" }, handleControl);

		expect(both.ok).toBe(false);
		expect(both.text).toContain("not both");
		expect(neither.ok).toBe(false);
		expect(neither.text).toContain("nothing was given");
	});
});

describe("applyHandleOp（当たり判定・選択・状況）", () => {
	it("当たった id を手前から並べる", () => {
		const receivedTargets: unknown[] = [];
		const result = applyHandleOp(
			{ kind: "hitTest", point: { x: 120, y: 80 }, tolerance: 8 },
			createFakeHandleControl({
				hitTest: (target, tolerance) => {
					receivedTargets.push({ target, tolerance });
					return ["rect-2", "rect-1"];
				},
			}),
		);

		expect(receivedTargets).toEqual([
			{ target: { x: 120, y: 80 }, tolerance: 8 },
		]);
		expect(result.ok).toBe(true);
		expect(result.text).toContain('"rect-2", "rect-1" at (120, 80)');
		expect(result.text).toContain(
			'"rect-2" is what a click there would land on',
		);
	});

	it("矩形指定は矩形の書式で返す", () => {
		const result = applyHandleOp(
			{ kind: "hitTest", rect: { x: 0, y: 0, width: 200, height: 100 } },
			createFakeHandleControl({ hitTest: () => ["rect-1"] }),
		);

		expect(result.text).toContain("(0, 0) 200 x 100 px");
	});

	it("何も無い座標は成功として返す（0 件は失敗ではない）", () => {
		const result = applyHandleOp(
			{ kind: "hitTest", point: { x: 900, y: 900 } },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("nothing is drawn at (900, 900)");
		expect(result.text).toContain("free");
	});

	it("点も矩形も無い当たり判定は失敗として返す", () => {
		const result = applyHandleOp(
			{ kind: "hitTest" },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("nothing was given to test");
	});

	it("選択中の id を件数つきで返す", () => {
		const result = applyHandleOp(
			{ kind: "getSelection" },
			createFakeHandleControl({ getSelectedIds: () => ["rect-1", "rect-2"] }),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("2 object(s) selected");
		expect(result.text).toContain('"rect-1", "rect-2"');
	});

	it("未選択は成功として返し、次の手を添える", () => {
		const result = applyHandleOp(
			{ kind: "getSelection" },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("nothing is selected");
		expect(result.text).toContain("select_objects");
	});

	it("操作状況は編集中テキストとドラッグを名指しする", () => {
		const result = applyHandleOp(
			{ kind: "getInteractionStatus" },
			createFakeHandleControl({
				getInteractionStatus: () => ({
					drag: "move",
					isInertialScrolling: false,
					editingTextId: "rect-1",
					drawingShapeType: null,
					modal: null,
					isBusy: true,
				}),
			}),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain('typing in "rect-1"');
		expect(result.text).toContain('a "move" drag is in progress');
		expect(result.text).toContain("busy");
	});

	it("何もしていなければ、書き込んでよいと分かる形で返す", () => {
		const result = applyHandleOp(
			{ kind: "getInteractionStatus" },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("no text is open in the editor");
		expect(result.text).toContain("no drag is in progress");
		expect(result.text).toContain("idle");
	});
});

describe("applyHandleOp（SVG・座標変換）", () => {
	it("上限内の SVG はそのまま返す", () => {
		const result = applyHandleOp(
			{ kind: "toSvg" },
			createFakeHandleControl({ toSvgString: () => "<svg><rect /></svg>" }),
		);

		expect(result).toEqual({ ok: true, text: "<svg><rect /></svg>" });
	});

	it("上限を超えた SVG は先頭だけを返し、代わりの読み方を添える", () => {
		const svg = "<svg>".padEnd(MAX_SVG_CHARS + 100, "x");
		const result = applyHandleOp(
			{ kind: "toSvg" },
			createFakeHandleControl({ toSvgString: () => svg }),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("SVG truncated");
		expect(result.text).toContain("capture_canvas");
		expect(result.text).not.toContain(svg);
	});

	it("client 座標をワールド座標へ変換する", () => {
		const result = applyHandleOp(
			{ kind: "toWorld", x: 320, y: 240 },
			createFakeHandleControl({ toWorld: () => ({ x: 100, y: 50 }) }),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("client (320, 240) is world (100, 50)");
	});

	it("未マウントの変換は、キャンバス不在とは別の理由を返す", () => {
		const result = applyHandleOp(
			{ kind: "toWorld", x: 320, y: 240 },
			createFakeHandleControl({ toWorld: () => null }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("has not finished mounting");
		expect(result.text).not.toContain("no canvas");
	});

	it("ワールド座標を client 座標へ変換し、すぐ古くなることを添える", () => {
		const result = applyHandleOp(
			{ kind: "toClient", x: 100, y: 50 },
			createFakeHandleControl({ toClient: () => ({ x: 320, y: 240 }) }),
		);

		expect(result.ok).toBe(true);
		expect(result.text).toContain("world (100, 50) is client (320, 240)");
		expect(result.text).toContain("pan and zoom");
	});

	it("未マウントの逆変換も同じ理由を返す", () => {
		const result = applyHandleOp(
			{ kind: "toClient", x: 100, y: 50 },
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("has not finished mounting");
	});
});
