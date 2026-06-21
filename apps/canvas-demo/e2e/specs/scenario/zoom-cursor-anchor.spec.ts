import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Ctrl+ホイールズームのカーソル基点保持（cursor-anchored zoom）の検証。
 *
 * 既存の driver-input.spec は「ズームで viewBox が変わる」ことしか見ておらず、
 * ズームの中核 UX である「カーソル直下の点が画面上で動かない」不変条件は
 * 守られていなかった。CanvasEventHandler のズーム計算（offset 比率で minX/minY を
 * 再計算する箇所）はリファクタで容易に壊れ、壊れると「ズームすると対象がどこかへ
 * 飛んでいく」体感バグになるが画面は壊れないため気づきにくい。
 *
 * 検証方法: カーソルを図形の中心に合わせてズームすると、その図形は拡大しても
 * 画面上の中心位置が動かないはず（カーソル直下の SVG 点が固定されるため）。
 * 図形の画面座標は DOM 要素の boundingBox から測る。
 */

const TOLERANCE_PX = 2;

/** 図形の画面上の中心座標を boundingBox から求める */
async function screenCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** 図形の画面上の幅 */
async function screenWidth(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return box.width;
}

test.describe("Ctrl+ホイールズームのカーソル基点保持", () => {
	test("図形の中心でズームインすると、その図形は拡大しても画面位置が動かない", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const before = await screenCenter(canvas, id);
		const widthBefore = await screenWidth(canvas, id);

		// カーソルを図形中心に置いてズームイン
		await canvas.wheel(before, { deltaY: -200, ctrl: true });

		// ズーム適用を待つ（拡大されたこと）
		await expect
			.poll(() => screenWidth(canvas, id), {
				message: "ズームインで図形が画面上で拡大すること",
			})
			.toBeGreaterThan(widthBefore + 1);

		// カーソル直下＝図形中心は画面上で動かない
		const after = await screenCenter(canvas, id);
		expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("図形の中心でズームアウトすると、その図形は縮小しても画面位置が動かない", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const before = await screenCenter(canvas, id);
		const widthBefore = await screenWidth(canvas, id);

		await canvas.wheel(before, { deltaY: 200, ctrl: true });

		await expect
			.poll(() => screenWidth(canvas, id), {
				message: "ズームアウトで図形が画面上で縮小すること",
			})
			.toBeLessThan(widthBefore - 1);

		const after = await screenCenter(canvas, id);
		expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("基点はカーソル位置: A の中心でズームすると A は留まり、離れた B は動く", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 900, y: 500 },
			{ x: 1000, y: 560 },
		);
		await canvas.deselect();

		const aBefore = await screenCenter(canvas, a);
		const bBefore = await screenCenter(canvas, b);
		const aWidthBefore = await screenWidth(canvas, a);

		// A の中心にカーソルを置いてズームイン
		await canvas.wheel(aBefore, { deltaY: -200, ctrl: true });

		await expect
			.poll(() => screenWidth(canvas, a))
			.toBeGreaterThan(aWidthBefore + 1);

		const aAfter = await screenCenter(canvas, a);
		const bAfter = await screenCenter(canvas, b);

		// A（カーソル直下）は画面上で動かない
		expect(Math.abs(aAfter.x - aBefore.x)).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(Math.abs(aAfter.y - aBefore.y)).toBeLessThanOrEqual(TOLERANCE_PX);

		// B（基点から離れている）は画面上で動く（基点が画面中心ではなくカーソルである証拠）
		const bMoved = Math.hypot(bAfter.x - bBefore.x, bAfter.y - bBefore.y);
		expect(bMoved).toBeGreaterThan(5);
	});
});
