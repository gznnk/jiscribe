import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { calcConnectorLabelAnchor } from "../calcConnectorLabelAnchor";

describe("calcConnectorLabelAnchor", () => {
	it("既定（position 0.5）は経路の中点を返す", () => {
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelAnchor(points)).toEqual({ x: 50, y: 0 });
	});

	it("複数セグメントでも経路長の比率で位置を求める", () => {
		// 全長 200（100 + 100）の L 字。position 0.5 は折れ曲がり点（角）。
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
		];
		expect(calcConnectorLabelAnchor(points, 0.5)).toEqual({ x: 100, y: 0 });
		expect(calcConnectorLabelAnchor(points, 0.25)).toEqual({ x: 50, y: 0 });
		expect(calcConnectorLabelAnchor(points, 0.75)).toEqual({ x: 100, y: 50 });
	});

	it("position は 0..1 にクランプされる", () => {
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelAnchor(points, -1)).toEqual({ x: 0, y: 0 });
		expect(calcConnectorLabelAnchor(points, 2)).toEqual({ x: 100, y: 0 });
	});

	it("offset は進行方向の左向き法線（-dy, dx）に沿ってずらす", () => {
		// 水平右向きセグメント。左向き法線は +y 方向。
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelAnchor(points, 0.5, 10)).toEqual({ x: 50, y: 10 });
		expect(calcConnectorLabelAnchor(points, 0.5, -10)).toEqual({
			x: 50,
			y: -10,
		});
	});

	it("点が 2 未満なら null（または単一点）を返す", () => {
		expect(calcConnectorLabelAnchor([])).toBeNull();
		expect(calcConnectorLabelAnchor([{ x: 5, y: 5 }])).toEqual({ x: 5, y: 5 });
	});

	it("総長 0（退化）の経路は始点を返す", () => {
		const points: Point[] = [
			{ x: 7, y: 7 },
			{ x: 7, y: 7 },
		];
		expect(calcConnectorLabelAnchor(points, 0.5, 10)).toEqual({ x: 7, y: 7 });
	});
});
