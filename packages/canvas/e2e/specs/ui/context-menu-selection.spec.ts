import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * What a right click selects before it opens the context menu.
 *
 * A right click on a shape selects it, so the menu acts on the shape that was
 * pointed at; a right click inside the current selection keeps it, so a
 * multi-selection survives; a right click on the background changes nothing.
 * Which shape ended up selected is read through the menu's own delete command —
 * the selection is not otherwise observable from the DOM, and the command is
 * what the user would reach for next anyway.
 *
 * Note: a right click placed right after a left click on the same spot would be
 * coalesced by the click recognizer into consecutive clicks, so the selection is
 * set up by drawing (auto-selected) or by a marquee drag, never by a left click
 * on the shape about to be right-clicked.
 */

const LEFT_CENTER = { x: 405, y: 240 };
/** Empty canvas, clear of both shapes and of the floating ObjectMenu. */
const BACKGROUND = { x: 70, y: 820 };

/** Draws the left rectangle then the right one, returning both ids */
async function drawLeftThenRight(
	canvas: CanvasDriver,
): Promise<{ left: string; right: string }> {
	const left = await canvas.drawShape(
		"Rectangle",
		{ x: 340, y: 180 },
		{ x: 470, y: 300 },
	);
	await canvas.deselect();
	const right = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 180 },
		{ x: 690, y: 300 },
	);
	return { left, right };
}

test.describe("context menu selection", () => {
	test("selects the right-clicked shape instead of the one already selected", async ({
		canvas,
	}) => {
		// The right rectangle stays auto-selected right after drawing.
		const { right } = await drawLeftThenRight(canvas);

		await canvas.openContextMenu(LEFT_CENTER);
		expect(await canvas.contextMenuVisible()).toBe(true);

		await canvas.clickContextMenuCommand("delete");

		await expect
			.poll(async () => (await canvas.captureObjects()).map((obj) => obj.id), {
				message:
					"the menu deletes the right-clicked shape, not the selected one",
			})
			.toEqual([right]);
	});

	test("keeps a multi-selection when one of its members is right-clicked", async ({
		canvas,
	}) => {
		await drawLeftThenRight(canvas);
		await canvas.deselect();

		// A marquee enclosing both; a drag, so it is never coalesced with the right
		// click that follows.
		await canvas.drag({ x: 310, y: 150 }, { x: 720, y: 330 });
		await expect
			.poll(async () => (await canvas.visibleControlIds()).length)
			.toBeGreaterThan(0);

		await canvas.openContextMenu(LEFT_CENTER);
		await canvas.clickContextMenuCommand("delete");

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "both members are still selected, so both are deleted",
			})
			.toBe(0);
	});

	test("keeps the selection when the background is right-clicked", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 340, y: 180 }, { x: 470, y: 300 });

		await canvas.openContextMenu(BACKGROUND);

		expect(
			await canvas.visibleControlIds(),
			"the shape drawn (and auto-selected) keeps its handles",
		).toContain("transform/resize:bottomRight");
	});
});
