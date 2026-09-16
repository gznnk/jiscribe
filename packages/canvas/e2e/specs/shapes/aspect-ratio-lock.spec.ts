import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards the aspect ratio lock (lockAspectRatio), which the properties sidebar's
 * Layout section holds — the floating menu offers it nowhere (see the last test).
 *
 * While locked, dragging a handle that moves a single edge (bottomCenter and
 * friends) keeps the aspect ratio without holding Shift, so the width changes
 * proportionally too. Once unlocked, such a handle changes only its own edge.
 *
 * Resizes hold ctrl to disable snapping, because snapped dimensions would blur
 * the ratio checks. The sidebar is closed again before every drag: it is not
 * rendered over the canvas, but the menu it replaces is, and the drags below are
 * the ones the reader compares against the unlocked case.
 */

/** The row's `data-part` names the press that follows, so "true" is the unlocked row. */
const LOCK_ON = selectors.propertyPanelSet("lockAspectRatio", "true");
const LOCK_OFF = selectors.propertyPanelSet("lockAspectRatio", "false");

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

/** Presses the sidebar's lock row and leaves the sidebar closed again. */
async function setLockFromSidebar(
	canvas: CanvasDriver,
	locked: boolean,
): Promise<void> {
	await canvas.openPropertyPanel();
	await canvas.page.click(locked ? LOCK_ON : LOCK_OFF);
	await expect(
		canvas.page.locator(locked ? LOCK_OFF : LOCK_ON),
	).toHaveAttribute("aria-checked", String(locked));
	await canvas.closePropertyPanel();
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

		await setLockFromSidebar(canvas, true);

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

		// Lock once, then unlock, so the drag below runs against a lock that was
		// explicitly taken off rather than one that was never on.
		await setLockFromSidebar(canvas, true);
		await setLockFromSidebar(canvas, false);

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
		await canvas.openPropertyPanel();

		// The marquee's multiSelectGroup defaults to lockAspectRatio=true and the
		// new Ctrl+G group inherits it, so the row reads locked first.
		const unlockRow = canvas.page.locator(LOCK_OFF);
		await expect(unlockRow).toHaveAttribute("aria-checked", "true");
		await unlockRow.click();

		// The row flips to the unlocked side once the write reaches state. With the
		// bug, features were unstamped, the write was a no-op and nothing flipped.
		const lockRow = canvas.page.locator(LOCK_ON);
		await expect(lockRow).toHaveAttribute("aria-checked", "false");

		// Press again to confirm it round-trips
		await lockRow.click();
		await expect(canvas.page.locator(LOCK_OFF)).toHaveAttribute(
			"aria-checked",
			"true",
		);
	});

	test("is not offered by the floating menu, which the sidebar replaced", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 300 });

		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		for (const value of ["true", "false"]) {
			await expect(
				canvas.page.locator(
					`${selectors.objectMenu} ${selectors.objectMenuSet("lockAspectRatio", value)}`,
				),
			).toHaveCount(0);
		}
	});
});
