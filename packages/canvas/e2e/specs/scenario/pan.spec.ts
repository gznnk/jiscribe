import { test, expect } from "../../fixtures";

/**
 * Behavioral invariants of a viewport pan (right drag).
 *
 * driver-input.spec goes as far as "rightDrag changes the viewBox", leaving the
 * invariants users actually rely on uncovered: (1) panning does not move a
 * shape's world coordinates, (2) the zoom factor does not change, (3) a shape can
 * be selected at its new screen position after the pan, i.e. the screen<->world
 * conversion is right. A conversion regression slips past a test that only
 * watches the viewBox, so clicking at the new position is what guards it.
 *
 * In the default viewport (zoom=1) the viewBox width equals the SVG pixel width,
 * so screen coordinates map as world coordinates minus viewBox.min, at scale 1.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

test.describe("viewport pan", () => {
	test("leaves the shape's world coordinates alone and lets it be selected at its new screen position", async ({
		canvas,
	}) => {
		// A rectangle centered at (500,300).
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 250 },
			{ x: 580, y: 350 },
		);
		await canvas.deselect();

		const worldBefore = await canvas.objectById(id).getAttribute("transform");
		const vbBefore = parseViewBox(await canvas.getViewBox());

		// Pan with a right drag.
		await canvas.rightDrag({ x: 700, y: 500 }, { x: 850, y: 600 });

		const vbAfter = parseViewBox(await canvas.getViewBox());

		// The zoom factor is unchanged, i.e. the viewBox keeps its size.
		expect(vbAfter.width).toBeCloseTo(vbBefore.width, 3);
		expect(vbAfter.height).toBeCloseTo(vbBefore.height, 3);
		// The pan shifts the origin (min).
		expect(
			vbAfter.minX !== vbBefore.minX || vbAfter.minY !== vbBefore.minY,
		).toBe(true);
		// The shape's world coordinates (transform) stay put.
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			worldBefore,
		);

		// Clicking at the new post-pan screen position (world center minus viewBox.min)
		// selects the shape. A broken conversion misses it and selectAt fails waiting
		// for the controls.
		const screen = { x: 500 - vbAfter.minX, y: 300 - vbAfter.minY };
		await canvas.selectAt(screen);
		expect(await canvas.isControlVisible("transform/resize:bottomRight")).toBe(
			true,
		);
	});
});
