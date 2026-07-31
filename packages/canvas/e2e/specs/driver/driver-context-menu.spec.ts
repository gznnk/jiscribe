import { test, expect } from "../../fixtures";

/**
 * Driver self-test for CanvasDriver's context menu operations.
 */
test.describe("driver: context menu", () => {
	test("opens the context menu when a shape is right-clicked", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });

		expect(await canvas.contextMenuVisible()).toBe(true);
	});

	test("adds an object and closes the menu on a command item (duplicate)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("duplicate");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	// The paste callback item runs through React's onClick rather than a gesture,
	// but PASTE makes handlePaste set contextMenuPosition to null, so the menu closes.
	test("adds an object and closes the menu on a callback item (paste)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// Copy first (command path; this closes the menu).
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("copy");
		const afterCopy = (await canvas.captureObjects()).length;

		// Then paste (callback path).
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuItem("paste");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(afterCopy + 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	// Nothing is copied first: the OS clipboard read fails without permission and
	// internalClipboard is null too.
	test("closes the menu when paste is clicked with nothing to paste (#34)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuItem("paste");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	test("closes the menu when clicking outside it", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });
		expect(await canvas.contextMenuVisible()).toBe(true);

		await canvas.deselect();

		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});
});
