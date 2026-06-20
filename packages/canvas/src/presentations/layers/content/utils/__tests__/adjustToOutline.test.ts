import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectRegistry } from "../../../../../controllers/setup/initializeObjectRegistry";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { adjustToOutline } from "../adjustToOutline";

beforeAll(() => {
	initializeObjectRegistry();
});

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

const ellipseObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "ellipse",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const point = (x: number, y: number) => ({ x, y });

describe("adjustToOutline", () => {
	it("obj が null → point をそのまま返す", () => {
		const p = point(10, 20);
		const toward = point(50, 50);
		expect(adjustToOutline(p, toward, null)).toEqual(p);
	});

	it("obj が undefined → point をそのまま返す", () => {
		const p = point(10, 20);
		const toward = point(50, 50);
		expect(adjustToOutline(p, toward, undefined)).toEqual(p);
	});

	it("features がない型（group）→ point をそのまま返す", () => {
		const groupObj = {
			id: "g1",
			type: "group",
			childIds: [],
		} as unknown as ObjectState;
		const p = point(0, 0);
		const toward = point(100, 0);
		expect(adjustToOutline(p, toward, groupObj)).toEqual(p);
	});

	it("rect の中心 → 外側に向いた輪郭点を返す（水平方向）", () => {
		// rect: cx=0, cy=0, width=100, height=100
		// toward が (200, 0)（右方向）→ 輪郭の右端 (50, 0) 付近
		const obj = rectObj("r1", 0, 0, 100, 100);
		const p = point(0, 0);
		const toward = point(200, 0);
		const result = adjustToOutline(p, toward, obj);
		expect(result).not.toBeNull();
		// 右端に向かうので x ≈ 50
		expect(result!.x).toBeCloseTo(50, 0);
		expect(result!.y).toBeCloseTo(0, 0);
	});

	it("ellipse の中心 → 外側に向いた輪郭点を返す（垂直方向）", () => {
		// ellipse: cx=0, cy=0, rx=60, ry=40
		const obj = ellipseObj("e1", 0, 0, 120, 80);
		const p = point(0, 0);
		const toward = point(0, 100);
		const result = adjustToOutline(p, toward, obj);
		expect(result).not.toBeNull();
		// 下端に向かうので y ≈ 40
		expect(result!.y).toBeCloseTo(40, 0);
		expect(result!.x).toBeCloseTo(0, 0);
	});

	it("toward が shape の内部 → null を返す（交差点なし）", () => {
		// rect 100x100, toward が内部点 (10, 10)
		const obj = rectObj("r1", 0, 0, 100, 100);
		const p = point(0, 0);
		const toward = point(10, 10);
		// 中心から内部への方向は交差なし → null
		const result = adjustToOutline(p, toward, obj);
		expect(result).toBeNull();
	});

	it("TransformedFrame でないオブジェクト（connector）→ point をそのまま返す", () => {
		const connObj = {
			id: "c1",
			type: "connector",
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
		} as unknown as ObjectState;
		const p = point(0, 0);
		const toward = point(200, 0);
		expect(adjustToOutline(p, toward, connObj)).toEqual(p);
	});
});
