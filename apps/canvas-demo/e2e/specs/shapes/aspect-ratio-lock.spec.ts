import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * ObjectMenu のアスペクト比ロック（lockAspectRatio）の挙動を守る。
 *
 * ロック中は Shift を押さなくても、一辺だけを動かすハンドル（bottomCenter など）の
 * ドラッグで縦横比が維持される（幅も比例して変わる）。解除すると一辺ハンドルは
 * その辺だけを変える。既存スイートは Shift 併用のアスペクト維持は見ているが、
 * メニュートグルによる lockAspectRatio は未カバーだったため、ここで埋める。
 *
 * スナップで寸法が吸着すると比率検証がぶれるため、リサイズは ctrl 併用で
 * スナップを無効化して行う。
 */

/** 図形の現在の枠サイズ（width / height 属性）を読む */
async function sizeOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number }> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		return {
			width: Number(el?.getAttribute("width")),
			height: Number(el?.getAttribute("height")),
		};
	}, id);
}

test.describe("アスペクト比ロック", () => {
	test("ロック中は bottomCenter ハンドルでも縦横比が保たれ、幅も比例して変わる", async ({
		canvas,
	}) => {
		// 幅200 × 高さ100（比率 2:1）の矩形。描画直後は選択済み。
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
		);
		const before = await sizeOf(canvas, id);
		const ratioBefore = before.width / before.height;

		const lockButton = canvas.page.locator(
			selectors.objectMenuSet("lockAspectRatio", "true"),
		);
		await expect(lockButton).toBeVisible();
		await lockButton.click();

		// 下辺中央ハンドルを下へ引いて高さを伸ばす（ctrl でスナップ無効）。
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 500, y: 440 },
			{ ctrl: true },
		);

		const after = await sizeOf(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		// ロックにより幅も追従して変化する（片側固定ではない）。
		expect(Math.abs(after.width - before.width)).toBeGreaterThan(20);
		// 縦横比は維持される。
		expect(after.width / after.height).toBeCloseTo(ratioBefore, 1);
	});

	test("ロックを解除すると bottomCenter ハンドルは高さだけを変える", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
		);
		const before = await sizeOf(canvas, id);

		// 一度ロックしてから解除する（トグルでボタンの data-id が反転する）。
		await canvas.page.click(selectors.objectMenuSet("lockAspectRatio", "true"));
		await canvas.page.click(
			selectors.objectMenuSet("lockAspectRatio", "false"),
		);

		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 500, y: 440 },
			{ ctrl: true },
		);

		const after = await sizeOf(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		// 解除後は幅が変わらない。
		expect(after.width).toBeCloseTo(before.width, 1);
	});
});
