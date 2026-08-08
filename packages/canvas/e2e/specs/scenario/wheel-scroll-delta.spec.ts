import { test, expect } from "../../fixtures";

/**
 * Guards the exact distance a wheel scroll (without Ctrl) moves the view.
 *
 * Other specs watch anchoring for wheel-as-zoom (with Ctrl); scrolling without
 * Ctrl is a separate path that translates the viewport by minX += deltaX/zoom,
 * minY += deltaY/zoom. At zoom=1 the wheel delta should equal the world delta
 * 1:1, and a stray coefficient, a wrong division by the zoom factor, or a scroll
 * turning into a zoom all survive a direction-only test. Three things are
 * pinned: the distance, the unchanged zoom factor, and the shape's unchanged
 * world coordinates.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const TOLERANCE_PX = 2;
const SCROLL = { deltaX: 80, deltaY: 150 };

test.describe("wheel scroll distance", () => {
	test("moves the viewBox origin by exactly the wheel delta at zoom=1, leaving the zoom factor alone", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 250 },
			{ x: 580, y: 350 },
		);
		await canvas.deselect();
		const worldBefore = await canvas.objectById(id).getAttribute("transform");

		const before = parseViewBox(await canvas.getViewBox());

		// Wheel without Ctrl scrolls; it does not zoom.
		await canvas.wheel(
			{ x: 500, y: 400 },
			{ deltaX: SCROLL.deltaX, deltaY: SCROLL.deltaY },
		);

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).minY, {
				message: "the scroll moves viewBox.minY",
			})
			.not.toBe(before.minY);

		const after = parseViewBox(await canvas.getViewBox());

		// The origin moves by exactly the wheel delta: minX += deltaX, minY += deltaY.
		expect(
			Math.abs(after.minX - before.minX - SCROLL.deltaX),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(
			Math.abs(after.minY - before.minY - SCROLL.deltaY),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		// Scrolling leaves the zoom factor, i.e. the viewBox size, unchanged.
		expect(after.width).toBeCloseTo(before.width, 3);
		expect(after.height).toBeCloseTo(before.height, 3);
		// The shape's world coordinates stay put.
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			worldBefore,
		);
	});
});
