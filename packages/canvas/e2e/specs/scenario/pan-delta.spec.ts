import { test, expect } from "../../fixtures";

/**
 * Guards the exact distance a pan (right drag) moves the view.
 *
 * pan.spec goes as far as "the viewBox min shifts and world coordinates stay
 * put" and never checks how far. At zoom=1 the screen drag distance equals the
 * world distance, so the viewBox origin (min) moves by exactly the drag: content
 * follows the cursor, so dragging down-right decreases min. A stray coefficient
 * in the pan amount, or a wrong division by the zoom factor, survives a test
 * that only asserts "it shifted".
 *
 * It also holds the zoom=1 invariant that viewBox width equals the SVG pixel width.
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
/** Screen distance covered by the right drag */
const DRAG_FROM = { x: 700, y: 500 };
const DRAG_TO = { x: 850, y: 600 };
const DELTA = { x: DRAG_TO.x - DRAG_FROM.x, y: DRAG_TO.y - DRAG_FROM.y }; // (150,100)

test.describe("pan distance", () => {
	test("moves the viewBox origin by exactly the drag distance at zoom=1, leaving the zoom factor alone", async ({
		canvas,
	}) => {
		// Place one shape and deselect it, to check the pan leaves it untouched.
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 250 },
			{ x: 580, y: 350 },
		);
		await canvas.deselect();
		const worldBefore = await canvas.objectById(id).getAttribute("transform");

		const before = parseViewBox(await canvas.getViewBox());

		await canvas.rightDrag(DRAG_FROM, DRAG_TO);

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).minX, {
				message: "the pan moves viewBox.minX",
			})
			.not.toBe(before.minX);

		const after = parseViewBox(await canvas.getViewBox());

		// The origin moves by exactly the drag: content follows the cursor, so dragging
		// down-right decreases min.
		expect(Math.abs(after.minX - before.minX - -DELTA.x)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(after.minY - before.minY - -DELTA.y)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		// The zoom factor, i.e. the viewBox size, is unchanged.
		expect(after.width).toBeCloseTo(before.width, 3);
		expect(after.height).toBeCloseTo(before.height, 3);
		// The shape's world coordinates stay put.
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			worldBefore,
		);
	});
});
