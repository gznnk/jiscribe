import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../objects/base/ObjectState";
import { calculateGroupOrientedBounds } from "../calculateGroupOrientedBounds";

/**
 * テスト用に最小限のフィールドだけを持つオブジェクトを構築するヘルパー群。
 * calculateGroupOrientedBounds が参照するのは type / childIds と
 * Frame・Poly のジオメトリフィールドのみなので、それ以外は省略する。
 */
const makeObjects = (
	entries: Record<string, Partial<ObjectState> & { type: string }>,
): Record<string, ObjectState> =>
	entries as unknown as Record<string, ObjectState>;

const makeGroup = (
	childIds: string[],
	transform?: { rotation?: number; scaleX?: number; scaleY?: number },
) =>
	({
		id: "g",
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		...transform,
	}) as unknown as ObjectState;

const makeFrame = (
	id: string,
	frame: {
		cx: number;
		cy: number;
		width: number;
		height: number;
		rotation?: number;
		scaleX?: number;
		scaleY?: number;
	},
) =>
	({
		id,
		type: "rect",
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...frame,
	}) as unknown as ObjectState;

const makePoly = (id: string, points: { x: number; y: number }[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown as ObjectState;

describe("calculateGroupOrientedBounds", () => {
	it("グループが存在しない場合は null を返す", () => {
		const result = calculateGroupOrientedBounds(makeObjects({}), "missing");
		expect(result).toBeNull();
	});

	it("対象オブジェクトが group 型でない場合は null を返す", () => {
		const objects = makeObjects({
			r1: { id: "r1", type: "rect" },
		});
		expect(calculateGroupOrientedBounds(objects, "r1")).toBeNull();
	});

	it("子要素が空の場合は null を返す", () => {
		const objects = {
			g: makeGroup([]),
		};
		expect(calculateGroupOrientedBounds(objects, "g")).toBeNull();
	});

	it("子要素がすべて存在しない ID の場合は null を返す", () => {
		const objects = {
			g: makeGroup(["ghost1", "ghost2"]),
		};
		expect(calculateGroupOrientedBounds(objects, "g")).toBeNull();
	});

	it("ジオメトリを持たない子のみの場合は null を返す", () => {
		const objects = {
			g: makeGroup(["c1"]),
			// frame でも poly でもない（geometry を持たない）子
			c1: { id: "c1", type: "connector" } as unknown as ObjectState,
		};
		expect(calculateGroupOrientedBounds(objects, "g")).toBeNull();
	});

	it("Frame 系の子要素のコーナー点から OBB を計算する", () => {
		const objects = {
			g: makeGroup(["f1", "f2"]),
			// (-5,-5)〜(5,5)
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
			// (15,-5)〜(25,5)
			f2: makeFrame("f2", { cx: 20, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// 合成範囲 x:[-5,25] y:[-5,5]
		expect(result).not.toBeNull();
		expect(result?.cx).toBeCloseTo(10);
		expect(result?.cy).toBeCloseTo(0);
		expect(result?.width).toBeCloseTo(30);
		expect(result?.height).toBeCloseTo(10);
		expect(result?.rotation).toBe(0);
		expect(result?.scaleX).toBe(1);
		expect(result?.scaleY).toBe(1);
	});

	it("存在しない子 ID は無視し、残りの子から OBB を計算する", () => {
		const objects = {
			g: makeGroup(["ghost", "f1"]),
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		expect(result?.cx).toBeCloseTo(0);
		expect(result?.cy).toBeCloseTo(0);
		expect(result?.width).toBeCloseTo(10);
		expect(result?.height).toBeCloseTo(10);
	});

	it("Poly 系の子要素は points 配列から OBB を計算する", () => {
		const objects = {
			g: makeGroup(["p1"]),
			p1: makePoly("p1", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 20 },
			]),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// x:[0,10] y:[0,20]
		expect(result?.cx).toBeCloseTo(5);
		expect(result?.cy).toBeCloseTo(10);
		expect(result?.width).toBeCloseTo(10);
		expect(result?.height).toBeCloseTo(20);
	});

	it("Frame と Poly が混在しても全点を含む OBB を計算する", () => {
		const objects = {
			g: makeGroup(["f1", "p1"]),
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
			p1: makePoly("p1", [{ x: 100, y: 100 }]),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// x:[-5,100] y:[-5,100]
		expect(result?.cx).toBeCloseTo(47.5);
		expect(result?.cy).toBeCloseTo(47.5);
		expect(result?.width).toBeCloseTo(105);
		expect(result?.height).toBeCloseTo(105);
	});

	it("ネストしたグループの子要素も再帰的に収集する", () => {
		const objects = {
			g: makeGroup(["inner", "f1"]),
			inner: {
				id: "inner",
				type: "group",
				childIds: ["f2"],
				cx: 0,
				cy: 0,
				width: 0,
				height: 0,
			} as unknown as ObjectState,
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
			f2: makeFrame("f2", { cx: 20, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// ネストした f2 も含めて x:[-5,25] y:[-5,5]
		expect(result?.cx).toBeCloseTo(10);
		expect(result?.width).toBeCloseTo(30);
		expect(result?.height).toBeCloseTo(10);
	});

	it("グループの rotation / scale を OBB の transform として保持する", () => {
		const objects = {
			g: makeGroup(["f1"], { rotation: 90, scaleX: 2, scaleY: 3 }),
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		expect(result?.rotation).toBe(90);
		expect(result?.scaleX).toBe(2);
		expect(result?.scaleY).toBe(3);
	});

	it("回転した Frame 子要素はコーナー点を回転させて包含する", () => {
		const objects = {
			g: makeGroup(["f1"]),
			// 90度回転させると幅と高さが入れ替わる
			f1: makeFrame("f1", {
				cx: 0,
				cy: 0,
				width: 20,
				height: 10,
				rotation: 90,
			}),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// 回転後の AABB は width:10 height:20
		expect(result?.width).toBeCloseTo(10);
		expect(result?.height).toBeCloseTo(20);
	});
});
