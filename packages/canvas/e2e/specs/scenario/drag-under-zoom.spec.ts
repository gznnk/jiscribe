import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Dragging a shape under a non-unit viewBox (while zoomed) must divide the
 * screen delta by the scale to get the world delta (the screen->world drag
 * conversion).
 *
 * Other specs guard the neighborhood of the viewport transform, each with its
 * own invariant, but dragging a shape while zoomed fell between them:
 *   - zoom-cursor-anchor.spec ... zoom anchoring (the point under the cursor
 *     stays put); no shape is moved
 *   - pan.spec ... selecting after a pan (screen<->world at zoom=1); no zoom
 *   - draw.spec "shapes can be moved by dragging" ... moves, but only at zoom=1
 * If the division by the zoom factor breaks, shapes move too far or not far
 * enough while zoomed — nothing on screen looks broken, so it is easy to miss.
 * At zoom=1 screenDelta == worldDelta hides such a regression, so this runs
 * zoomed in.
 */

const TOLERANCE_PX = 2;

/** Pull e,f out of transform="matrix(1, 0, 0, 1, e, f)" — the shape's world center */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** World center of a shape, taken from the transform reported by captureObjects */
async function worldCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const obj = (await canvas.captureObjects()).find((o) => o.id === id);
	if (!obj) {
		throw new Error(`shape ${id} not found`);
	}
	return centerOf(obj.transform);
}

/** Shape center in content coordinates (boundingBox screen coordinates through toContent) */
async function contentCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** On-screen width of a shape, used as the signal that a zoom has been applied */
async function screenWidth(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return box.width;
}

/**
 * World length one screen pixel spans at the current zoom = viewBox width / SVG
 * screen width. 1 at zoom=1, below 1 when zoomed in. The largest-area svg is
 * taken as the canvas itself (the same choice getViewBox makes).
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

test.describe("shape drag under zoom", () => {
	test("moves the shape by screen delta x scale in world coordinates when dragged after zooming in", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		// Zoom in with the cursor on the shape center; anchoring there keeps its screen position fixed.
		const centerBeforeZoom = await contentCenter(canvas, id);
		const widthBeforeZoom = await screenWidth(canvas, id);
		await canvas.wheel(centerBeforeZoom, { deltaY: -200, ctrl: true });
		await expect
			.poll(() => screenWidth(canvas, id), {
				message: "zooming in grows the shape on screen",
			})
			.toBeGreaterThan(widthBeforeZoom + 1);

		const scale = await worldPerScreenPixel(canvas);
		// Zoomed in, so one screen pixel spans less world length (< 1). Pin this down first:
		// without it the test cannot tell itself apart from zoom=1 and proves nothing.
		expect(scale).toBeLessThan(1);

		// Zoom only changes the viewBox; the shape's world coordinates stay put.
		const worldBefore = await worldCenter(canvas, id);

		// Grab the shape center (content coordinates) and drag +160, +100 on screen.
		const grab = await contentCenter(canvas, id);
		const screenDelta = { x: 160, y: 100 };
		await canvas.drag(grab, {
			x: grab.x + screenDelta.x,
			y: grab.y + screenDelta.y,
		});

		const worldAfter = await worldCenter(canvas, id);

		// worldDelta = screenDelta x scale. Forgetting to divide by the zoom factor
		// makes worldDelta ~ screenDelta and fails here.
		expect(
			Math.abs(worldAfter.x - worldBefore.x - screenDelta.x * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(
			Math.abs(worldAfter.y - worldBefore.y - screenDelta.y * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});
