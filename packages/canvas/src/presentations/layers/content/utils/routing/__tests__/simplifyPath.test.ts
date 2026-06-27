import { describe, expect, it } from "vitest";

import { simplifyPath } from "../simplifyPath";

describe("simplifyPath", () => {
	it("連続する重複点を畳む（長さ0セグメントを消す）", () => {
		expect(
			simplifyPath([
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
		]);
	});

	it("単調な共線の中間点は畳む（通過するだけの点を消す）", () => {
		expect(
			simplifyPath([
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
				{ x: 100, y: 0 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
	});

	it("角（直交する折れ）は残す", () => {
		const L = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
		];
		expect(simplifyPath(L)).toEqual(L);
	});

	it("折り返し（逆走）する中間点は畳まず温存する", () => {
		// 0→100→50 は同一軸で逆走。スタブの押し出し方向を保つため残す。
		const spike = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 50, y: 0 },
		];
		expect(simplifyPath(spike)).toEqual(spike);
	});

	it("2 点以下はそのまま返す", () => {
		expect(
			simplifyPath([
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]);
	});
});
