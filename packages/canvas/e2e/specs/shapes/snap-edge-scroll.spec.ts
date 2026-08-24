import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Snapping stands down on the ticks an edge scroll drives, and comes back on the
 * release.
 *
 * The drag is held in the top edge zone (within 20px of the canvas top), so the
 * viewport scrolls along Y only and the dragged shape's X stays exactly where the
 * pointer left it. That makes an X-axis candidate a fixed target throughout the
 * hold: the moving shape's center sits 3 away from it, inside the threshold of 8
 * (SNAP_THRESHOLD_PX), for as long as the scroll runs. Were the scrolling ticks
 * still snapping, the vertical guide would be up and the center already pulled
 * onto the candidate.
 */

/** minY of the viewBox (`minX minY w h`), which decreases as the view scrolls upward. */
async function viewBoxMinY(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot get the viewBox");
	}
	return Number(raw.trim().split(/\s+/)[1]);
}

/** Center X of a shape, read off its transform (`matrix(1, 0, 0, 1, cx, cy)`). */
async function centerX(canvas: CanvasDriver, id: string): Promise<number> {
	const shape = (await canvas.captureObjects()).find((obj) => obj.id === id);
	const matched = /matrix\([^)]*?,\s*([-\d.]+),\s*[-\d.]+\)/.exec(
		shape?.transform ?? "",
	);
	if (!matched) {
		throw new Error(`cannot read the transform of ${id}`);
	}
	return Number(matched[1]);
}

test.describe("snapping during an edge scroll", () => {
	test("leaves the center uncorrected while the edge scroll runs, then snaps it on release", async ({
		canvas,
	}) => {
		// A: 200 x 100 centered at (500, 200); its center X 500 is the candidate.
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		// B: 100 x 100 centered at (400, 450). The widths differ, so B's left/right
		// (447/547 once moved) meet no candidate and only the centers can align.
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 350, y: 400 },
			{ x: 450, y: 500 },
		);
		await canvas.deselect();

		const minYBefore = await viewBoxMinY(canvas);
		const from = canvas.toScreen({ x: 400, y: 450 });
		// Held at content X 497 — 3 from A's center X, and far from both side zones.
		const holdX = canvas.toScreen({ x: 497, y: 0 }).x;
		const topZoneY = canvas.toScreen({ x: 0, y: 0 }).y + 4;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			// The drag starts clear of every edge, which arms edge scrolling; holding in
			// the top zone then scrolls upward on its own.
			await canvas.page.mouse.move(holdX, topZoneY, { steps: 12 });
			await expect
				.poll(() => viewBoxMinY(canvas), {
					message: "the hold in the top zone scrolls the view upward",
				})
				.toBeLessThan(minYBefore - 1);

			await expect(canvas.snapGuides("x")).toHaveCount(0);
			expect(await centerX(canvas, bId)).toBe(497);
		} finally {
			await canvas.page.mouse.up();
		}

		// dragEnd carries no scroll of its own, so the released position snaps.
		await expect.poll(() => centerX(canvas, bId)).toBe(500);
	});
});
