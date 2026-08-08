import { test, expect } from "../fixtures";
import { selectors } from "../support/selectors";

test.describe("smoke", () => {
	test("shows the toolbar", async ({ canvas }) => {
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

	test("creates a shape and auto-selects it when a rectangle is drawn", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// Selected right after drawing (handles and the ObjectMenu appear).
		await expect(
			canvas.page.locator(selectors.transformControl("bottomRight")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("bg-color")),
		).toBeVisible();
	});
});
