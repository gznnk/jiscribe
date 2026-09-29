import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Clipboard operations from the keyboard.
 * - Duplicate (Ctrl+D) does not go through the clipboard
 * - Copy/Cut/Paste round-trip through the internal clipboard
 *   (falling back to internalClipboard when the OS clipboard read fails)
 * - Paste falls back to the middle of the view when the offset position is off screen
 */

/** The world rect the view shows, read from the main svg's viewBox. */
async function visibleWorldRect(canvas: CanvasDriver): Promise<{
	minX: number;
	minY: number;
	width: number;
	height: number;
}> {
	const viewBox = await canvas.getViewBox();
	const [minX, minY, width, height] = (viewBox ?? "").split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** Centers of every shape, taken from the e,f of transform="matrix(a, b, c, d, e, f)". */
async function centers(
	canvas: CanvasDriver,
): Promise<{ x: number; y: number }[]> {
	const objects = await canvas.captureObjects();
	return objects.flatMap((obj) => {
		const matched = /matrix\(([^)]*)\)/.exec(obj.transform ?? "");
		if (!matched) {
			return [];
		}
		const parts = matched[1].split(",").map(Number);
		return [{ x: parts[4], y: parts[5] }];
	});
}
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

	test("pastes into the middle of the view when the source has been panned off screen", async ({
		canvas,
	}) => {
		// A rect centered at world (500,260); the plain offset would place the copy at (520,280).
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.copy();

		// Pan until that landing spot is well behind the left edge of the view.
		for (let i = 0; i < 3; i++) {
			await canvas.rightDrag({ x: 700, y: 700 }, { x: 100, y: 100 });
		}
		const visible = await visibleWorldRect(canvas);
		expect(visible.minX).toBeGreaterThan(520);

		// Culling drops the original once it leaves the view, so the copy is the only
		// shape rendered afterwards — which is itself the point: it landed in sight.
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);

		const [pasted] = await centers(canvas);
		expect(pasted.x).toBeGreaterThan(visible.minX);
		expect(pasted.x).toBeLessThan(visible.minX + visible.width);
		expect(pasted.y).toBeGreaterThan(visible.minY);
		expect(pasted.y).toBeLessThan(visible.minY + visible.height);
	});
});
