import { describe, it, expect } from "vitest";

import {
	calcLocalOffsetForRotation,
	calcWorldPointFromLocalOffset,
} from "../calcLocalOffsetForRotation";

describe("calcLocalOffsetForRotation", () => {
	it("回転なしは trig を通さず world オフセットをそのまま local とする", () => {
		const offset = calcLocalOffsetForRotation(10, 20, 0, { x: 40, y: 60 });
		expect(offset.isRotated).toBe(false);
		expect(offset.cos).toBe(1);
		expect(offset.sin).toBe(0);
		expect(offset.dx).toBeCloseTo(30);
		expect(offset.dy).toBeCloseTo(40);
	});

	it("90度回転時は world オフセットを -90度回して local に変換する", () => {
		// 中心(0,0), rotation=90。world (100, 0) は local では -90度回転した (0, -100)
		const offset = calcLocalOffsetForRotation(0, 0, 90, { x: 100, y: 0 });
		expect(offset.isRotated).toBe(true);
		expect(offset.cos).toBeCloseTo(0);
		expect(offset.sin).toBeCloseTo(1);
		expect(offset.dx).toBeCloseTo(0);
		expect(offset.dy).toBeCloseTo(-100);
	});

	it("中心が原点以外でも中心相対でオフセットを算出する", () => {
		const offset = calcLocalOffsetForRotation(5, -3, 0, { x: 12, y: 7 });
		expect(offset.dx).toBeCloseTo(7);
		expect(offset.dy).toBeCloseTo(10);
	});

	it("toward が中心と同じなら dx/dy はともに 0", () => {
		const offset = calcLocalOffsetForRotation(4, 8, 45, { x: 4, y: 8 });
		expect(offset.dx).toBeCloseTo(0);
		expect(offset.dy).toBeCloseTo(0);
	});
});

describe("calcWorldPointFromLocalOffset", () => {
	it("回転なしは local 点を平行移動するだけ", () => {
		const world = calcWorldPointFromLocalOffset(10, 20, 3, 4, {
			cos: 1,
			sin: 0,
			isRotated: false,
		});
		expect(world.x).toBeCloseTo(13);
		expect(world.y).toBeCloseTo(24);
	});

	it("90度回転時は local 点を +90度回して world に戻す", () => {
		// cos/sin は rotation=90 のもの。local (10, 0) は +90度回転で (0, 10)
		const world = calcWorldPointFromLocalOffset(0, 0, 10, 0, {
			cos: Math.cos(Math.PI / 2),
			sin: Math.sin(Math.PI / 2),
			isRotated: true,
		});
		expect(world.x).toBeCloseTo(0);
		expect(world.y).toBeCloseTo(10);
	});
});

describe("calcLocalOffsetForRotation ⇄ calcWorldPointFromLocalOffset の往復", () => {
	it("world → local → world で元の点に戻る（任意の回転・中心）", () => {
		const cx = 7;
		const cy = -4;
		const rotation = 37;
		const toward = { x: 123, y: 56 };

		const offset = calcLocalOffsetForRotation(cx, cy, rotation, toward);
		// local オフセットをそのまま world へ戻せば toward に一致するはず
		const restored = calcWorldPointFromLocalOffset(
			cx,
			cy,
			offset.dx,
			offset.dy,
			offset,
		);
		expect(restored.x).toBeCloseTo(toward.x);
		expect(restored.y).toBeCloseTo(toward.y);
	});

	it("回転なしでも往復で元の点に戻る", () => {
		const offset = calcLocalOffsetForRotation(2, 3, 0, { x: 50, y: -10 });
		const restored = calcWorldPointFromLocalOffset(
			2,
			3,
			offset.dx,
			offset.dy,
			offset,
		);
		expect(restored.x).toBeCloseTo(50);
		expect(restored.y).toBeCloseTo(-10);
	});
});
