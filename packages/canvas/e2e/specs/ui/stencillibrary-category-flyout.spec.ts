import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Core behavior of the StencilLibrary category flyout (#184 option A).
 *
 * - Pressing a category button opens the flyout and reveals the shape items inside
 *   (the same `data-part="item:<presetId>"` contract as the pinned items).
 * - Shapes in the flyout go through the existing StencilLibraryItemHandler as is, so a
 *   click enters drawing mode and a drag onto the canvas actually creates the shape.
 * - It closes on the pointerup that picks a shape, on an outside click, and on Escape.
 *
 * Drawing mode being on is observed through the Canvas cursor: crosshair (flyout items
 * unmount on pointerup, so the canvas is watched rather than the tool button cursor).
 */

const FLOWCHART = "flowchart";

/** Computed cursor of the canvas (data-kind="canvas"). crosshair = drawing mode on. */
async function canvasCursor(canvas: CanvasDriver): Promise<string> {
	return canvas.page
		.locator('[data-kind="canvas"]')
		.evaluate((el) => getComputedStyle(el).cursor);
}

test.describe("StencilLibrary category flyout", () => {
	test("creates a shape by dragging one out of an opened category flyout", async ({
		canvas,
	}) => {
		// The flyout starts closed
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);

		// Pressing the category button opens the flyout and reveals the diamond item
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toBeVisible();
		const diamondItem = canvas.page.locator(selectors.shapeItem("diamond"));
		await expect(diamondItem).toBeVisible();

		// Clicking an item enters drawing mode (the Canvas turns crosshair) and the
		// flyout closes on pointerup
		const before = (await canvas.captureObjects()).length;
		await diamondItem.click();
		await expect
			.poll(() => canvasCursor(canvas), {
				message: "clicking a shape in the flyout enters drawing mode",
			})
			.toBe("crosshair");
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);

		// Drag onto the canvas to actually create it (inside, clear of the top edge zone)
		await canvas.drag({ x: 360, y: 240 }, { x: 520, y: 360 });
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "a new shape is created through the flyout",
			})
			.toBe(before + 1);
	});

	test("closes the flyout on Escape and on an outside click", async ({
		canvas,
	}) => {
		// Close with Escape
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toBeVisible();
		await canvas.page.keyboard.press("Escape");
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);

		// Reopen, then close with a click on empty canvas (outside)
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toBeVisible();
		const empty = canvas.toScreen({ x: 700, y: 600 });
		await canvas.page.mouse.click(empty.x, empty.y);
		await expect(
			canvas.page.locator(selectors.categoryFlyout(FLOWCHART)),
		).toHaveCount(0);
	});
});
