import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Checks that a resize under a non-unit viewBox (while zoomed) divides the
 * handle's screen movement by the scale to give the right world size change
 * (the screen to world resize conversion).
 *
 * drag-under-zoom.spec guards the move (translate) path; this one guards the
 * resize path (TransformController's size calculation). Both the handle position
 * and the drag delta are involved, so a dropped factor is easier to make here
 * than when moving. resize.spec / resize-flip / resize-snap all run at zoom=1,
 * where handle delta (screen) == size delta (world) and the regression hides, so
 * this checks "size delta == handle delta * scale" while zoomed in.
 *
 * Snapping is disabled with ctrl, since size snapping can fire even for a single
 * shape, to measure the handle's plain follow.
 */

const TOLERANCE_PX = 2;

/**
 * World length of one screen pixel at the current zoom = viewBox width / SVG
 * screen width. It is 1 at zoom=1 and below 1 when zoomed in. The largest svg by
 * area is taken as the canvas itself (the same pick as getViewBox).
 */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
	return vbWidth / svgScreenWidth;
}

/** Screen-coordinate center of a transform handle (boundingBox returns screen coordinates). */
async function handleScreenCenter(
	canvas: CanvasDriver,
	handle: "bottomRight",
): Promise<{ x: number; y: number }> {
	const control = canvas.page.locator(selectors.transformControl(handle));
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`cannot locate the ${handle} transform handle`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("resizing under zoom", () => {
	test("changes the world size by the screen movement times the scale on a bottomRight resize after zooming in", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// drawShape auto-selects. Zoom with the handles still up; zooming does not clear the selection.
		const rect = canvas.objectById(id);

		// Zoom in with the cursor on the shape's center, which therefore keeps its screen position.
		const box0 = await rect.boundingBox();
		if (!box0) {
			throw new Error("cannot read the shape's boundingBox");
		}
		const center = canvas.toContent({
			x: box0.x + box0.width / 2,
			y: box0.y + box0.height / 2,
		});
		await canvas.wheel(center, { deltaY: -200, ctrl: true });
		await expect
			.poll(async () => (await rect.boundingBox())?.width ?? 0, {
				message: "zooming in makes the shape larger on screen",
			})
			.toBeGreaterThan(box0.width + 1);

		const scale = await worldPerScreenPixel(canvas);
		// Zooming in shortens the world length of one screen pixel (< 1). Without
		// that the test cannot be told apart from zoom=1, so pin it first.
		expect(scale).toBeLessThan(1);

		// The world size (width/height attributes) does not change with zoom, so read the baseline here.
		const worldW0 = Number(await rect.getAttribute("width"));
		const worldH0 = Number(await rect.getAttribute("height"));

		// Drag the bottomRight handle by a known screen movement.
		// dragTransformHandle takes `to` in content coordinates and drags from the
		// handle center to toScreen(to), so to = toContent(handle + delta) makes the
		// screen movement exactly delta. ctrl disables snapping.
		const handle = await handleScreenCenter(canvas, "bottomRight");
		const screenDelta = { x: 140, y: 90 };
		const to = canvas.toContent({
			x: handle.x + screenDelta.x,
			y: handle.y + screenDelta.y,
		});
		await canvas.dragTransformHandle("bottomRight", to, { ctrl: true });

		const worldW1 = Number(await rect.getAttribute("width"));
		const worldH1 = Number(await rect.getAttribute("height"));

		// World size change = screen movement * scale.
		// With the regression (the division dropped) the size delta ~= the screen delta and fails here.
		expect(
			Math.abs(worldW1 - worldW0 - screenDelta.x * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(
			Math.abs(worldH1 - worldH0 - screenDelta.y * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});
