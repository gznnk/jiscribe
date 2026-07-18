import { test, expect } from "../../fixtures";

/**
 * ホイールスクロール（Ctrl なし）の「移動量」を精密に守る。
 *
 * 既存テストは wheel＝ズーム（Ctrl 併用）の基点保持を見るが、Ctrl なしのスクロールは
 * viewport を minX += deltaX/zoom, minY += deltaY/zoom で平行移動する別経路。zoom=1 では
 * ホイール量＝world 移動量で 1:1 のはずで、ここに係数が紛れ込む／ズーム割り戻しを誤る／
 * スクロールがズームに化ける退行は方向だけの検証では捕まらない。移動量・倍率不変・
 * 図形ワールド座標不動の 3 点で固める。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const TOLERANCE_PX = 2;
const SCROLL = { deltaX: 80, deltaY: 150 };

test.describe("ホイールスクロールの移動量", () => {
	test("zoom=1 では viewBox 原点がホイール量ぶんちょうど動く（倍率は不変）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 250 },
			{ x: 580, y: 350 },
		);
		await canvas.deselect();
		const worldBefore = await canvas.objectById(id).getAttribute("transform");

		const before = parseViewBox(await canvas.getViewBox());

		// Ctrl なしホイール = スクロール（ズームではない）。
		await canvas.wheel(
			{ x: 500, y: 400 },
			{ deltaX: SCROLL.deltaX, deltaY: SCROLL.deltaY },
		);

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).minY, {
				message: "スクロールで viewBox.minY が動くこと",
			})
			.not.toBe(before.minY);

		const after = parseViewBox(await canvas.getViewBox());

		// 原点はホイール量ぶんちょうど動く（minX += deltaX, minY += deltaY）。
		expect(
			Math.abs(after.minX - before.minX - SCROLL.deltaX),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(
			Math.abs(after.minY - before.minY - SCROLL.deltaY),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		// スクロールでズーム倍率（viewBox 寸法）は変わらない。
		expect(after.width).toBeCloseTo(before.width, 3);
		expect(after.height).toBeCloseTo(before.height, 3);
		// 図形のワールド座標は動かない。
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			worldBefore,
		);
	});
});
