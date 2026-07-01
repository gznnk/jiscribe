import { beforeAll, describe, expect, it } from "vitest";

import { ZOOM } from "../../../constants/zoom";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { calcFitViewport } from "../calcFitViewport";

beforeAll(() => {
	initializeObjectRegistry();
});

/** 軸並行（無回転）の Frame 系 state。bbox は left=cx-w/2 … で自明。 */
const rectObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/** Frame 条件を満たさない純 Poly state（isPoly 分岐を通す）。 */
const polylineObj = (
	id: string,
	points: { x: number; y: number }[],
): ObjectState =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown as ObjectState;

const toRecord = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

describe("calcFitViewport", () => {
	it("オブジェクトが無ければ null を返す", () => {
		expect(calcFitViewport({}, { width: 800, height: 600 })).toBeNull();
	});

	it("単一矩形をビューポート中央に収め、zoom と原点を算出する", () => {
		// bbox: left=0, right=200, top=50, bottom=150 → 中心(100,100)、200x100
		const objects = toRecord([rectObj("r1", 100, 100, 200, 100)]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 50,
		});

		// 横: (800-100)/200=3.5, 縦: (600-100)/100=5 → 制約の厳しい 3.5
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(3.5, 4);
		expect(viewport!.width).toBe(800);
		expect(viewport!.height).toBe(600);
		// minX = cx - width/(2*zoom) = 100 - 800/7
		expect(viewport!.minX).toBeCloseTo(100 - 800 / 7, 3);
		expect(viewport!.minY).toBeCloseTo(100 - 600 / 7, 3);
	});

	it("複数オブジェクトの和集合バウンドにフィットする", () => {
		const objects = toRecord([
			rectObj("r1", 50, 50, 100, 100), // left0 top0 right100 bottom100
			rectObj("r2", 350, 250, 100, 100), // left300 top200 right400 bottom300
		]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		// 和集合: 400x300、中心(200,150)
		// 横 800/400=2, 縦 600/300=2 → 2
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(2, 4);
		expect(viewport!.minX).toBeCloseTo(200 - 800 / 4, 3);
		expect(viewport!.minY).toBeCloseTo(150 - 600 / 4, 3);
	});

	it("group は対象外（group のみなら null）", () => {
		const group = {
			id: "g1",
			type: "group",
			cx: 100,
			cy: 100,
			width: 200,
			height: 200,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		} as unknown as ObjectState;

		expect(
			calcFitViewport(toRecord([group]), { width: 800, height: 600 }),
		).toBeNull();
	});

	it("group を無視し、内包する非 group オブジェクトだけでフィットする", () => {
		const group = {
			id: "g1",
			type: "group",
			cx: 0,
			cy: 0,
			width: 10000,
			height: 10000,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		} as unknown as ObjectState;
		const rect = rectObj("r1", 100, 100, 200, 100);

		const withGroup = calcFitViewport(toRecord([group, rect]), {
			width: 800,
			height: 600,
			padding: 50,
		});
		const rectOnly = calcFitViewport(toRecord([rect]), {
			width: 800,
			height: 600,
			padding: 50,
		});

		// group の巨大バウンドに引きずられず、rect 単体と同じ結果になる
		expect(withGroup).toEqual(rectOnly);
	});

	it("Poly（polyline）のバウンドも含める", () => {
		const objects = toRecord([
			polylineObj("p1", [
				{ x: 0, y: 0 },
				{ x: 200, y: 100 },
			]),
		]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 50,
		});

		// bbox 200x100、中心(100,50) → 矩形ケースと同じ zoom
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(3.5, 4);
		expect(viewport!.minX).toBeCloseTo(100 - 800 / 7, 3);
		expect(viewport!.minY).toBeCloseTo(50 - 600 / 7, 3);
	});

	it("free 端点コネクターのバウンドも含める", () => {
		const connector = {
			id: "c1",
			type: "connector",
			routing: "straight",
			points: [],
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 200, y: 100 } } },
		} as unknown as ObjectState;

		const viewport = calcFitViewport(toRecord([connector]), {
			width: 800,
			height: 600,
			padding: 50,
		});

		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(3.5, 4);
	});

	it("コンテンツが小さく拡大率が上限を超える場合は ZOOM.MAX にクランプする", () => {
		const objects = toRecord([rectObj("r1", 0, 0, 10, 10)]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		// 横 80, 縦 60 → どちらも ZOOM.MAX(10) を超える
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBe(ZOOM.MAX);
	});

	it("コンテンツが巨大で拡大率が下限を下回る場合は ZOOM.MIN にクランプする", () => {
		const objects = toRecord([rectObj("r1", 0, 0, 100_000, 100_000)]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBe(ZOOM.MIN);
	});

	it("両軸サイズ 0 の退化コンテンツ（単一点 Poly）は null を返す", () => {
		const objects = toRecord([polylineObj("p1", [{ x: 42, y: 42 }])]);

		expect(calcFitViewport(objects, { width: 800, height: 600 })).toBeNull();
	});

	it("片軸のみ広がりがある場合でも、その軸の拡大率でフィットする", () => {
		// 水平な 2 点ポリライン: width=200, height=0
		const objects = toRecord([
			polylineObj("p1", [
				{ x: 0, y: 50 },
				{ x: 200, y: 50 },
			]),
		]);

		const viewport = calcFitViewport(objects, {
			width: 800,
			height: 600,
			padding: 0,
		});

		// height=0 は候補から除外され、横 800/200=4 が採用される
		expect(viewport).not.toBeNull();
		expect(viewport!.zoom).toBeCloseTo(4, 4);
	});
});
