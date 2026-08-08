import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Dispatch of stacking-order commands from the context menu (right click).
 *
 * driver-context-menu covers the dispatch of duplicate / copy / paste, but arrange
 * commands such as bringToFront / sendToBack had no coverage through the context menu.
 * (ObjectMenu's arrange is tested separately.) The result is guarded in DOM order
 * (later elements are in front).
 *
 * Note: right click does not change the selection; it opens the menu for the current
 * selection. Right-clicking a shape immediately after left-clicking it would be
 * coalesced by the click recognizer into consecutive clicks, so the target is
 * right-clicked while still auto-selected from drawing (no selectAt in between).
 */

const TARGET_CENTER = { x: 570, y: 250 };

/** Draws the back rectangle then the front one (left auto-selected), returning both ids */
async function drawBackThenSelectedFront(
	canvas: CanvasDriver,
): Promise<{ back: string; target: string }> {
	const back = await canvas.drawShape(
		"Rectangle",
		{ x: 350, y: 200 },
		{ x: 450, y: 300 },
	);
	await canvas.deselect();
	// The second one stays auto-selected right after drawing (= the right-click target).
	const target = await canvas.drawShape(
		"Rectangle",
		{ x: 520, y: 200 },
		{ x: 620, y: 300 },
	);
	return { back, target };
}

test.describe("context menu stacking order", () => {
	test("moves the selected shape to the back (first in DOM) on right click -> send to back", async ({
		canvas,
	}) => {
		const { back, target } = await drawBackThenSelectedFront(canvas);
		// Initially target (drawn later) is in front.
		expect(await canvas.objectIndex(target)).toBeGreaterThan(
			await canvas.objectIndex(back),
		);

		await canvas.openContextMenu(TARGET_CENTER);
		await canvas.clickContextMenuCommand("sendToBack");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);

		await expect
			.poll(async () => await canvas.objectIndex(target))
			.toBeLessThan(await canvas.objectIndex(back));
	});

	test("brings a shape sent to the back to the front again (last in DOM) on right click -> bring to front", async ({
		canvas,
	}) => {
		const { back, target } = await drawBackThenSelectedFront(canvas);

		// Send to back first so that bringToFront has something to do.
		await canvas.openContextMenu(TARGET_CENTER);
		await canvas.clickContextMenuCommand("sendToBack");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
		await expect
			.poll(async () => await canvas.objectIndex(target))
			.toBeLessThan(await canvas.objectIndex(back));

		// The selection is kept, so right-click again to bring it to the front.
		await canvas.openContextMenu(TARGET_CENTER);
		await canvas.clickContextMenuCommand("bringToFront");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);

		await expect
			.poll(async () => await canvas.objectIndex(target))
			.toBeGreaterThan(await canvas.objectIndex(back));
	});
});
