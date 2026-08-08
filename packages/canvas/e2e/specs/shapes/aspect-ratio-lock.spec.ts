import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards the ObjectMenu aspect ratio lock (lockAspectRatio).
 *
 * While locked, dragging a handle that moves a single edge (bottomCenter and
 * friends) keeps the aspect ratio without holding Shift, so the width changes
 * proportionally too. Once unlocked, such a handle changes only its own edge.
 *
 * Resizes hold ctrl to disable snapping, because snapped dimensions would blur
 * the ratio checks.
 */

/** Reads the shape's current frame size (width / height attributes). */
async function sizeOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number }> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		return {
			width: Number(el?.getAttribute("width")),
			height: Number(el?.getAttribute("height")),
		};
	}, id);
}

test.describe("aspect ratio lock", () => {
	test("keeps the aspect ratio and scales the width when bottomCenter is dragged while locked", async ({
		canvas,
	}) => {
		// 200 x 100 rect (ratio 2:1). Selected right after drawing.
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
		);
		const before = await sizeOf(canvas, id);
		const ratioBefore = before.width / before.height;

		const lockButton = canvas.page.locator(
			selectors.objectMenuSet("lockAspectRatio", "true"),
		);
		await expect(lockButton).toBeVisible();
		await lockButton.click();

		// Pull the bottom-center handle down to grow the height (ctrl: no snapping).
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 500, y: 440 },
			{ ctrl: true },
		);

		const after = await sizeOf(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		// The lock makes the width follow instead of staying pinned.
		expect(Math.abs(after.width - before.width)).toBeGreaterThan(20);
		// The aspect ratio survives.
		expect(after.width / after.height).toBeCloseTo(ratioBefore, 1);
	});

	test("changes only the height with the bottomCenter handle once unlocked", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
		);
		const before = await sizeOf(canvas, id);

		// Lock once, then unlock (the toggle flips the button's data-id).
		await canvas.page.click(selectors.objectMenuSet("lockAspectRatio", "true"));
		await canvas.page.click(
			selectors.objectMenuSet("lockAspectRatio", "false"),
		);

		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 500, y: 440 },
			{ ctrl: true },
		);

		const after = await sizeOf(canvas, id);
		expect(after.height).toBeGreaterThan(before.height);
		// The width no longer follows once unlocked.
		expect(after.width).toBeCloseTo(before.width, 1);
	});

	// Regression guard: features were not stamped onto a group created with
	// Ctrl+G, so toggling lockAspectRatio silently became a no-op.
	test("toggles the lock when a group is selected", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 500, y: 300 });
		await canvas.drawShape("Rectangle", { x: 550, y: 200 }, { x: 650, y: 300 });

		// Select both with a marquee, then group
		await canvas.drag({ x: 380, y: 180 }, { x: 670, y: 320 });
		await canvas.group();

		// The marquee's multiSelectGroup defaults to lockAspectRatio=true and the
		// new Ctrl+G group inherits it, so the unlock button shows first.
		const unlockButton = canvas.page.locator(
			selectors.objectMenuSet("lockAspectRatio", "false"),
		);
		await expect(unlockButton).toBeVisible();
		await unlockButton.click();

		// The button flips to the locked (true) side once the write reaches state.
		// With the bug, features were unstamped, the write was a no-op and nothing flipped.
		const lockButton = canvas.page.locator(
			selectors.objectMenuSet("lockAspectRatio", "true"),
		);
		await expect(lockButton).toBeVisible();

		// Press again to confirm it round-trips
		await lockButton.click();
		await expect(unlockButton).toBeVisible();
	});
});
