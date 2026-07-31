import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Drawing a new shape under a non-unit viewBox (while zoomed) must map the
 * diagonal drag in screen coordinates back to the right world position and size
 * (the screen->world creation conversion).
 *
 * drag-under-zoom guards the move path and resize-under-zoom the resize path,
 * but both act on shapes that already exist. Creation is a separate path that
 * inverts the drag rect as world = viewBox.min + content x scale; when it breaks,
 * shapes drawn while zoomed appear at the wrong place and size. At zoom=1
 * content == world hides such a regression, so this runs zoomed in.
 */

const TOLERANCE_PX = 2;

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** Pull e,f out of transform="matrix(1, 0, 0, 1, e, f)" — the shape's world center */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** Screen width of the largest-area svg, i.e. the canvas itself (the same choice getViewBox makes) */
async function svgScreenWidth(canvas: CanvasDriver): Promise<number> {
	return canvas.page.evaluate(() => {
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
}

test.describe("shape drawing under zoom", () => {
	test("gives a rectangle drawn after zooming in the world position and size the inverse conversion dictates", async ({
		canvas,
	}) => {
		// Zoom the viewport with nothing drawn yet; ctrl+wheel is a pure viewport operation.
		const initialViewBox = await canvas.getViewBox();
		await canvas.wheel({ x: 700, y: 450 }, { deltaY: -200, ctrl: true });
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "zooming in changes the viewBox",
			})
			.not.toBe(initialViewBox);

		const vb = parseViewBox(await canvas.getViewBox());
		const scale = vb.width / (await svgScreenWidth(canvas));
		// Zoomed in, so one screen pixel spans less world length (< 1). Pin this down first:
		// without it the test cannot tell itself apart from zoom=1 and proves nothing.
		expect(scale).toBeLessThan(1);

		// Draw the rectangle with a diagonal drag in content coordinates.
		const from = { x: 400, y: 200 };
		const to = { x: 600, y: 360 };
		const id = await canvas.drawShape("Rectangle", from, to);

		const obj = (await canvas.captureObjects()).find((o) => o.id === id);
		if (!obj) {
			throw new Error(`shape ${id} not found`);
		}
		const worldCenter = centerOf(obj.transform);
		const rect = canvas.objectById(id);
		const worldWidth = Number(await rect.getAttribute("width"));
		const worldHeight = Number(await rect.getAttribute("height"));

		// world = viewBox.min + content x scale. Forgetting to divide by the zoom factor
		// makes content pass through as world and fails here.
		const expectedCenterX = vb.minX + ((from.x + to.x) / 2) * scale;
		const expectedCenterY = vb.minY + ((from.y + to.y) / 2) * scale;
		const expectedWidth = (to.x - from.x) * scale;
		const expectedHeight = (to.y - from.y) * scale;

		expect(Math.abs(worldCenter.x - expectedCenterX)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(worldCenter.y - expectedCenterY)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(worldWidth - expectedWidth)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(worldHeight - expectedHeight)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
	});
});
