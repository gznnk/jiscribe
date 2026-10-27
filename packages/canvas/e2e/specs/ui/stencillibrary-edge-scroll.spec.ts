import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Edge scrolling must not fire spuriously when a D&D starts from StencilLibrary UI
 * that touches an edge of the canvas, while still working once the pointer has left
 * the edge zone (arm-on-leave).
 *
 * The shape library sidebar touches the left of the Canvas, so at the moment one of its
 * items is grabbed and dragged toward the canvas the cursor is necessarily inside the
 * left edge zone (within about 20px of the edge, or beyond it). The old implementation
 * fired edge scrolling right from dragStart and panned the canvas before the pointer had
 * even moved inside. Now it arms only after the pointer leaves the edge zone during the
 * drag, so only the spurious scroll right after grabbing disappears. (The top toolbar
 * touches the top edge the same way; this harness pins its presets on the bottom bar,
 * which floats clear of the bottom zone.)
 *
 * Observed through minX of the SVG viewBox (`minX minY w h`), which moves on leftward
 * scrolling. With the default viewport (zoom=1, the SVG drawn nearly 1:1 in its
 * container) the left zone is about 20px on screen, so a point a few px from the edge is
 * inside the zone and 200px to the right is clearly outside.
 */

/** The viewBox of the canvas SVG, parsed (world coordinates). */
async function readViewBox(
	canvas: CanvasDriver,
): Promise<{ minX: number; minY: number; width: number; height: number }> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot get the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** minX of the viewBox (moves on horizontal scrolling). */
async function viewBoxMinX(canvas: CanvasDriver): Promise<number> {
	return (await readViewBox(canvas)).minX;
}

/**
 * Opens the sidebar and waits until the canvas has measured the narrower
 * viewport (the viewBox width matches the canvas area at zoom 1). Until then the
 * edge zone is computed from the old width, and a drag started early arms at
 * once.
 */
async function openStencilLibraryMeasured(canvas: CanvasDriver): Promise<void> {
	await canvas.openStencilLibrary();
	const canvasArea = canvas.page.locator(selectors.canvasArea);
	await expect
		.poll(
			async () => {
				const { width } = await readViewBox(canvas);
				const box = await canvasArea.boundingBox();
				return box ? Math.abs(width - box.width) <= 1 : false;
			},
			{ message: "the viewport is measured with the sidebar open" },
		)
		.toBe(true);
}

/** Screen center of the sidebar's Rectangle item (boundingBox returns screen coordinates). */
async function rectItemCenter(
	canvas: CanvasDriver,
): Promise<{ x: number; y: number }> {
	const item = canvas.page.locator(selectors.stencilLibraryPanelItem("rect"));
	const box = await item.boundingBox();
	if (!box) {
		throw new Error("cannot get the position of the Rectangle item");
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("StencilLibrary D&D edge scrolling (arm-on-leave)", () => {
	test("does not pan the canvas when grabbing from the edge and staying in the left zone", async ({
		canvas,
	}) => {
		await openStencilLibraryMeasured(canvas);
		const minXBefore = await viewBoxMinX(canvas);

		const from = await rectItemCenter(canvas);
		// A few px right of the left edge, inside the zone. Vertically near the middle to
		// stay clear of the top and bottom edges.
		const leftZoneX = canvas.toScreen({ x: 0, y: 0 }).x + 4;
		const holdY = canvas.toScreen({ x: 0, y: 400 }).y;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(leftZoneX, holdY, { steps: 12 });

			// A spurious scroll would move minX on its own within a few frames. Since this
			// asserts that nothing happens, wait for enough frames before comparing.
			await canvas.page.waitForTimeout(400);

			expect(await viewBoxMinX(canvas)).toBe(minXBefore);
		} finally {
			await canvas.page.mouse.up();
		}
	});

	test("edge-scrolls leftward when returning to the left after leaving the zone once (armed)", async ({
		canvas,
	}) => {
		await openStencilLibraryMeasured(canvas);
		const minXBefore = await viewBoxMinX(canvas);

		const from = await rectItemCenter(canvas);
		const leftX = canvas.toScreen({ x: 0, y: 0 }).x;
		const holdY = canvas.toScreen({ x: 0, y: 400 }).y;

		await canvas.page.mouse.move(from.x, from.y);
		await canvas.page.mouse.down();
		try {
			// Arm: move right past the left edge zone (well inside).
			await canvas.page.mouse.move(leftX + 220, holdY, { steps: 12 });
			// Back into the left zone and hold: armed, so leftward scrolling starts.
			await canvas.page.mouse.move(leftX + 4, holdY, { steps: 10 });

			// Leftward scrolling keeps decreasing minX on its own; sync by polling.
			await expect
				.poll(() => viewBoxMinX(canvas), {
					message:
						"once armed, the left edge triggers edge scrolling (minX decreases)",
				})
				.toBeLessThan(minXBefore - 1);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});
