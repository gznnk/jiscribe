import { describe, it, expect } from "vitest";

import { degreesToRadians } from "../../common/degreesToRadians";
import { calcFrameCornerPoints } from "../../geometry/calcFrameCornerPoints";
import { calcAffineTransformedPoint } from "../../transform/calcAffineTransformedPoint";
import type { TransformedFrame } from "../../types";

/**
 * リファクタ前の実装をそのまま再現したオラクル。
 * 各 corner を calcAffineTransformedPoint で個別変換し、意味論が変わって
 * いないことを検証するための参照値として使う。
 */
const cornersByReference = (frame: TransformedFrame) => {
	const { cx, cy, width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const radians = degreesToRadians(rotation);
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth, y: -halfHeight },
		{ x: halfWidth, y: halfHeight },
		{ x: -halfWidth, y: halfHeight },
	].map((corner) =>
		calcAffineTransformedPoint(
			corner.x,
			corner.y,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	);
};

describe("calcFrameCornerPoints", () => {
	it("rotation=0の場合は軸平行な4隅を左上から時計回りで返す", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(corners).toEqual([
			{ x: 50, y: 75 },
			{ x: 150, y: 75 },
			{ x: 150, y: 125 },
			{ x: 50, y: 125 },
		]);
	});

	it("rotation=90の場合は4隅が回転後の座標になる", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// 左上(-50,-25)が回転して(cx+25, cy-50)へ
		expect(corners[0].x).toBeCloseTo(125);
		expect(corners[0].y).toBeCloseTo(50);
		expect(corners[2].x).toBeCloseTo(75);
		expect(corners[2].y).toBeCloseTo(150);
	});

	it("scaleX/scaleYが4隅に反映される", () => {
		// 一般 scale(±1 以外)の math が保たれていることの退行検出。型は FlipScale だが
		// 実装は一般 scale 対応のままなので、定義域外の値を cast で流して検証する。
		const corners = calcFrameCornerPoints({
			cx: 0,
			cy: 0,
			width: 100,
			height: 50,
			rotation: 0,
			scaleX: 2,
			scaleY: -1,
		} as unknown as TransformedFrame);
		// 左上(-50,-25) -> (-100, 25)
		expect(corners[0]).toEqual({ x: -100, y: 25 });
		// 右上(50,-25) -> (100, 25)
		expect(corners[1]).toEqual({ x: 100, y: 25 });
		// 右下(50,25) -> (100, -25)
		expect(corners[2]).toEqual({ x: 100, y: -25 });
		// 左下(-50,25) -> (-100, -25)
		expect(corners[3]).toEqual({ x: -100, y: -25 });
	});

	it("rotation/scaleX/scaleYを省略するとデフォルト(0/1/1)が使われる", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
		} as TransformedFrame);
		// rotation=0, scaleX=scaleY=1 の軸平行な4隅
		expect(corners).toEqual([
			{ x: 50, y: 75 },
			{ x: 150, y: 75 },
			{ x: 150, y: 125 },
			{ x: 50, y: 125 },
		]);
	});

	it("rotation!==0のとき4隅すべてが個別アフィン変換と一致する（回転のみ）", () => {
		const frame: TransformedFrame = {
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 30,
			scaleX: 1,
			scaleY: 1,
		};
		const corners = calcFrameCornerPoints(frame);
		const reference = cornersByReference(frame);
		corners.forEach((corner, index) => {
			expect(corner.x).toBeCloseTo(reference[index].x);
			expect(corner.y).toBeCloseTo(reference[index].y);
		});
	});

	it("rotationとscaleの複合でも4隅すべてが個別アフィン変換と一致する", () => {
		// 回転と非単位スケール（flip含む）を組み合わせた退行検出用ケース。
		// 一般 scale の math を検証するため、FlipScale の定義域外の値を cast で流す。
		const cases = [
			{
				cx: 10,
				cy: 20,
				width: 80,
				height: 40,
				rotation: 45,
				scaleX: 2,
				scaleY: 3,
			},
			{
				cx: -30,
				cy: 15,
				width: 120,
				height: 60,
				rotation: 135,
				scaleX: -1,
				scaleY: 1,
			},
			{
				cx: 0,
				cy: 0,
				width: 50,
				height: 200,
				rotation: -60,
				scaleX: 1,
				scaleY: -2,
			},
			{
				cx: 5,
				cy: -5,
				width: 100,
				height: 100,
				rotation: 200,
				scaleX: -1,
				scaleY: -1,
			},
		] as TransformedFrame[];
		for (const frame of cases) {
			const corners = calcFrameCornerPoints(frame);
			const reference = cornersByReference(frame);
			corners.forEach((corner, index) => {
				expect(corner.x).toBeCloseTo(reference[index].x);
				expect(corner.y).toBeCloseTo(reference[index].y);
			});
		}
	});
});
