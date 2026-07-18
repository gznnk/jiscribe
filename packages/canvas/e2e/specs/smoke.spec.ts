import { test, expect } from "../fixtures";
import { selectors } from "../support/selectors";

test.describe("スモーク", () => {
	test("ツールバーが表示される", async ({ canvas }) => {
		for (const tool of [
			"Rectangle",
			"Ellipse",
			"Polyline",
			"Polygon",
			"Sticky",
			"Markdown",
		] as const) {
			await expect(
				canvas.page.locator(selectors.toolButton(tool)),
			).toBeVisible();
		}
	});

	test("矩形を描くと図形が作成され自動選択される", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// 描画直後は選択状態（ハンドルと ObjectMenu が表示される）
		await expect(
			canvas.page.locator(selectors.transformControl("bottomRight")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("bg-color")),
		).toBeVisible();
	});
});
