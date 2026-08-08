import { test, expect } from "../../fixtures";

/**
 * Keyboard scope across multiple Canvases (issue #24).
 * The shortcut keydown listener is scoped to the focusable CanvasRoot rather
 * than document, so with several Canvases on one page only the focused one
 * handles shortcuts.
 * ?multi is a verification page with two Canvases side by side, holding rect-a
 * and rect-b respectively.
 */
test.describe("keyboard: multi-Canvas scope", () => {
	test("handles shortcuts only in the focused Canvas", async ({ page }) => {
		await page.goto("/?multi");
		const canvasA = page.getByTestId("canvas-a");
		const canvasB = page.getByTestId("canvas-b");
		// One shape renders several elements sharing a data-id (body, hit area and
		// so on), so presence is checked with first() / count 0.
		const rectA = canvasA.locator('[data-id="rect-a"]');
		const rectB = canvasB.locator('[data-id="rect-b"]');
		await expect(rectA.first()).toBeVisible();
		await expect(rectB.first()).toBeVisible();

		// Select a shape in both canvases; selection state is held per Canvas.
		await rectA.first().click();
		await expect(canvasA.locator("[data-kind=control]").first()).toBeVisible();
		await rectB.first().click();
		await expect(canvasB.locator("[data-kind=control]").first()).toBeVisible();

		// Delete runs only in B, the canvas clicked last and therefore focused.
		// With the old document-level listener both Canvases reacted and rect-a
		// disappeared too.
		await page.keyboard.press("Delete");
		await expect(rectB).toHaveCount(0);
		await expect(rectA.first()).toBeVisible();
	});
});
