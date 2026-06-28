import { describe, expect, it } from "vitest";

import {
	DOUBLE_CLICK_DISTANCE_THRESHOLD,
	DOUBLE_CLICK_THRESHOLD,
} from "../../GestureRecognizerConstants";
import type { ClickSnapshot } from "../../GestureRecognizerTypes";
import { isDoubleClick } from "../isDoubleClick";

// しきい値は平方で定義されているため、距離はその平方根が境界になる。
const DISTANCE = Math.sqrt(DOUBLE_CLICK_DISTANCE_THRESHOLD);

const snapshot = (overrides: Partial<ClickSnapshot> = {}): ClickSnapshot => ({
	time: 1000,
	targetId: "obj-1",
	clientPos: { x: 0, y: 0 },
	...overrides,
});

describe("isDoubleClick", () => {
	describe("基準未記録（previous = null）", () => {
		it("previous が null なら常に false（初回クリックは doubleClick にしない）", () => {
			expect(isDoubleClick(null, snapshot())).toBe(false);
		});
	});

	describe("成立条件をすべて満たす", () => {
		it("同一ターゲット・時間内・距離内なら true", () => {
			const previous = snapshot({ time: 1000, clientPos: { x: 0, y: 0 } });
			const current = snapshot({ time: 1100, clientPos: { x: 2, y: 1 } });
			expect(isDoubleClick(previous, current)).toBe(true);
		});

		it("距離 0（完全同一位置）でも true", () => {
			const previous = snapshot({ time: 1000 });
			const current = snapshot({ time: 1000 });
			expect(isDoubleClick(previous, current)).toBe(true);
		});
	});

	describe("ターゲット", () => {
		it("targetId が異なれば false", () => {
			const previous = snapshot({ targetId: "obj-1" });
			const current = snapshot({ time: 1100, targetId: "obj-2" });
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("両方 undefined（背景同士）なら一致扱い", () => {
			const previous = snapshot({ targetId: undefined });
			const current = snapshot({ time: 1100, targetId: undefined });
			expect(isDoubleClick(previous, current)).toBe(true);
		});
	});

	describe("時間しきい値", () => {
		it("しきい値ちょうどは外側（false）", () => {
			const previous = snapshot({ time: 1000 });
			const current = snapshot({ time: 1000 + DOUBLE_CLICK_THRESHOLD });
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("しきい値直前は内側（true）", () => {
			const previous = snapshot({ time: 1000 });
			const current = snapshot({ time: 1000 + DOUBLE_CLICK_THRESHOLD - 1 });
			expect(isDoubleClick(previous, current)).toBe(true);
		});
	});

	describe("距離しきい値（画面座標）", () => {
		it("しきい値ちょうどの距離は外側（false）", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE, y: 0 },
			});
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("しきい値直前の距離は内側（true）", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE - 0.001, y: 0 },
			});
			expect(isDoubleClick(previous, current)).toBe(true);
		});

		it("距離は両軸の合成で測る（斜め方向もしきい値を超えれば false）", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			// (4,4) の距離は √32 ≒ 5.66 > √25=5 なので外側
			const current = snapshot({ time: 1100, clientPos: { x: 4, y: 4 } });
			expect(isDoubleClick(previous, current)).toBe(false);
		});
	});
});
