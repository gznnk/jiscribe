import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Dragging a table out of the shape library. A table is the first shipped shape
 * whose box is measured rather than stored, which is what made the ghost and the
 * drop disagree: the ghost drew the grid around the cursor while the drop put the
 * grid's top-left there, so the shape jumped by half its size on release.
 *
 * Both halves are pinned here because either one alone would pass while the pair
 * was still wrong.
 */

/** Client rect of a drawn object, ghost included — the ghost carries its own id. */
async function drawnBox(
	canvas: CanvasDriver,
	objectId: string,
): Promise<{ x: number; y: number; width: number; height: number }> {
	return canvas.page.evaluate((id) => {
		const group = document.querySelector(`[data-id="${id}"]`);
		if (group === null) {
			throw new Error(`no object ${id}`);
		}
		const box = group.getBoundingClientRect();
		return { x: box.x, y: box.y, width: box.width, height: box.height };
	}, objectId);
}

const GHOST_ID = "drag-ghost";
/** Well inside the canvas and clear of the top edge zone, which auto-scrolls. */
const DROP_POINT = { x: 500, y: 320 };

test.describe("dragging a table out of the shape library", () => {
	test("drops it where the ghost was, centered on the cursor", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const item = canvas.page.locator(
			selectors.stencilLibraryPanelItem("table"),
		);
		const to = canvas.toScreen(DROP_POINT);

		// hover() presses from the item's own center, so the drag needs no measuring.
		await item.hover();
		await canvas.page.mouse.down();
		let ghost: { x: number; y: number; width: number; height: number };
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
			// The ghost is mounted on a frame of its own, so waiting on the element is
			// what keeps this from racing the render (the kit synchronizes on state,
			// never on time — see e2e/README.md).
			await canvas.page
				.locator(`[data-id="${GHOST_ID}"]`)
				.waitFor({ state: "attached" });
			ghost = await drawnBox(canvas, GHOST_ID);
		} finally {
			await canvas.page.mouse.up();
		}

		// The ghost is the grid itself, not a placeholder: it has the size the
		// dropped table will have.
		expect(ghost.width).toBeGreaterThan(0);
		expect(ghost.height).toBeGreaterThan(0);
		// Centered on the cursor, as every other shape's ghost is.
		expect(ghost.x + ghost.width / 2).toBeCloseTo(to.x, 0);
		expect(ghost.y + ghost.height / 2).toBeCloseTo(to.y, 0);

		const placed = (await canvas.captureObjects()).at(-1);
		expect(placed?.id).toBeDefined();
		const dropped = await drawnBox(canvas, placed!.id!);

		// The drop lands on the ghost: the release must not move the shape.
		expect(dropped.x).toBeCloseTo(ghost.x, 0);
		expect(dropped.y).toBeCloseTo(ghost.y, 0);
		expect(dropped.width).toBeCloseTo(ghost.width, 0);
		expect(dropped.height).toBeCloseTo(ghost.height, 0);
	});
});
