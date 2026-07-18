import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターの「少なくとも一方の端は owned」不変条件を、UI の端点ハンドル表示で守る spec。
 *
 * ConnectorControls は、片端が free のとき対になる owned 端のハンドルを隠す
 * （showSourceHandle = sourceIsFree || !targetIsFree）。隠さないと最後の owned 端を空中へ
 * ドラッグして「両端 free」を作れてしまうため。これは「両端 free を防ぐ」不変条件の
 * UI レベルでの実体（handleDragEnd の防御ガードはこのため通常到達しない）。
 *
 * 観測契約:
 *   - 両端 owned のコネクター → source / target 両方の端点ハンドルが出る
 *   - 片端 free のコネクター → free 端のハンドルだけ出て、残る owned 端のハンドルは出ない
 *
 * これにより「最後の owned 端を free 化する操作」が UI 上できないこと＝不変条件が守られて
 * いることを担保する。
 */

function sourceHandle(canvas: CanvasDriver, id: string) {
	return canvas.page.locator(`[data-id="${id}"][data-part="endpoint:source"]`);
}
function targetHandle(canvas: CanvasDriver, id: string) {
	return canvas.page.locator(`[data-id="${id}"][data-part="endpoint:target"]`);
}

/**
 * 水平コネクター（y=350）の中点をクリックして選択し、指定端点ハンドルの出現を待つ。
 * 単発クリックはまれに線を外すため、ハンドルが出るまでクリックを繰り返す（再選択は冪等）。
 */
async function selectUntilHandle(
	canvas: CanvasDriver,
	id: string,
	endpoint: "source" | "target",
) {
	await expect
		.poll(
			async () => {
				await canvas.clickAt({ x: 610, y: 350 });
				return canvas.page
					.locator(`[data-id="${id}"][data-part="endpoint:${endpoint}"]`)
					.count();
			},
			{
				message: `${endpoint} ハンドルが出るまで線をクリックする`,
				timeout: 8000,
			},
		)
		.toBeGreaterThan(0);
}

test.describe("コネクター端点ハンドルの表示（owned/free）", () => {
	test("両端 owned のコネクターは source / target 両方のハンドルが出る", async ({
		canvas,
	}) => {
		// A.rightCenter → B.leftCenter（両端 owned の水平コネクター）。
		await canvas.drawShape("Rectangle", { x: 300, y: 300 }, { x: 460, y: 400 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 760, y: 300 }, { x: 920, y: 400 });
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 840, y: 350 });
		await canvas.deselect();

		// 線上をクリックして選択（source ハンドル出現で確定）。
		await selectUntilHandle(canvas, id, "source");

		// 両端 owned なので両方のハンドルが出る。
		await expect(
			sourceHandle(canvas, id),
			"両端 owned では source ハンドルが出ること",
		).toBeVisible();
		await expect(
			targetHandle(canvas, id),
			"両端 owned では target ハンドルが出ること",
		).toBeVisible();
	});

	test("片端 free のコネクターは owned 端のハンドルを隠し、free 端のみ出す", async ({
		canvas,
	}) => {
		// A.rightCenter → 空きスペース（target が free）。source A のみ owned。
		await canvas.drawShape("Rectangle", { x: 300, y: 300 }, { x: 460, y: 400 });
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 760, y: 350 });
		await canvas.deselect();

		// 線上をクリックして選択。free 端（target）のハンドル出現で選択完了を待つ。
		await selectUntilHandle(canvas, id, "target");
		await expect(
			targetHandle(canvas, id),
			"free 端（target）のハンドルは出ること",
		).toBeVisible();

		// 残る owned 端（source）のハンドルは隠れている＝最後の owned 端を free 化できない。
		await expect(
			sourceHandle(canvas, id),
			"owned 端（source）のハンドルは隠れていること（最後の owned 端は free 化不可）",
		).toHaveCount(0);
	});
});
