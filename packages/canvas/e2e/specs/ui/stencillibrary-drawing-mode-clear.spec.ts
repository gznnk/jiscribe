import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors, type ToolTitle } from "../../support/selectors";

/**
 * The StencilLibrary drawing mode is cleared by the following two operations.
 *
 * 1. Pressing a shape that does not support drawing (Sticky and other shapes without
 *    bounds drawing). Those are placed immediately on press and never enter drawing
 *    mode, so shapeDrawing is set to null on click to keep a previous drawing mode from
 *    lingering.
 * 2. Starting a D&D with any shape. Drag placement is a path of its own, so drawing
 *    mode is cleared at dragStart.
 *
 * Drawing mode on/off is observed through each tool button's cursor: only the button of
 * the preset being drawn gets cursor: crosshair (isActive), inactive ones fall back to
 * grab (the style contract of StencilLibraryStyled).
 */

/** Computed cursor of a tool button. crosshair = drawing mode on / grab = off. */
async function toolCursor(
	canvas: CanvasDriver,
	tool: ToolTitle,
): Promise<string> {
	return canvas.page
		.locator(selectors.toolButton(tool))
		.evaluate((el) => getComputedStyle(el).cursor);
}

/** Screen center of a tool button (boundingBox returns screen coordinates). */
async function toolButtonCenter(
	canvas: CanvasDriver,
	tool: ToolTitle,
): Promise<{ x: number; y: number }> {
	const box = await canvas.page
		.locator(selectors.toolButton(tool))
		.boundingBox();
	if (!box) {
		throw new Error(`cannot get the position of the ${tool} button`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Clicks a tool button to enter drawing mode (waits for cursor: crosshair). */
async function enterDrawingMode(canvas: CanvasDriver, tool: ToolTitle) {
	await canvas.page.click(selectors.toolButton(tool));
	await expect
		.poll(() => toolCursor(canvas, tool), {
			message: `${tool} enters drawing mode`,
		})
		.toBe("crosshair");
}

test.describe("StencilLibrary drawing mode clearing", () => {
	test("clears drawing mode when a shape without drawing support (Sticky) is pressed while drawing", async ({
		canvas,
	}) => {
		await enterDrawingMode(canvas, "Rectangle");

		// Pressing Sticky places it at the center immediately and should clear drawing mode
		const stickyId = await canvas.placeShape("Sticky");
		expect(stickyId).toBeTruthy();

		await expect
			.poll(() => toolCursor(canvas, "Rectangle"), {
				message: "pressing Sticky clears Rectangle's drawing mode",
			})
			.toBe("grab");
	});

	test("clears drawing mode when a shape D&D starts while drawing", async ({
		canvas,
	}) => {
		await enterDrawingMode(canvas, "Rectangle");

		const before = (await canvas.captureObjects()).length;

		// Grab the Ellipse button and start dragging into the canvas. The clearing at
		// dragStart is checked before releasing.
		const from = await toolButtonCenter(canvas, "Ellipse");
		// Far enough inside to avoid the top edge zone (which triggers auto-scroll);
		// horizontally near the center.
		const to = canvas.toScreen({ x: 400, y: 260 });

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });

			await expect
				.poll(() => toolCursor(canvas, "Rectangle"), {
					message: "starting a D&D clears Rectangle's drawing mode",
				})
				.toBe("grab");
		} finally {
			await canvas.page.mouse.up();
		}

		// Completing the D&D places one Ellipse and leaves drawing mode cleared
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the D&D places a new shape",
			})
			.toBe(before + 1);
		expect(await toolCursor(canvas, "Rectangle")).toBe("grab");
	});
});
