import { test, expect } from "../../fixtures";

/**
 * Clipboard operations from the keyboard.
 * - Duplicate (Ctrl+D) does not go through the clipboard
 * - Copy/Cut/Paste round-trip through the internal clipboard
 *   (falling back to internalClipboard when the OS clipboard read fails)
 */
test.describe("keyboard: clipboard", () => {
	test("duplicates the selected shape on Ctrl+D", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("adds an object when copy-pasting with Ctrl+C then Ctrl+V", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("removes the shape on Ctrl+X and brings it back on Ctrl+V", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.cut();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);

		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
	});

	test("removes the pasted copy on undo after Ctrl+V and restores it on redo", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);

		// Paste is pushed onto the history, so undo removes only the copy and the
		// original stays.
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("removes the duplicate on undo after Ctrl+D and restores it on redo", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});
});
