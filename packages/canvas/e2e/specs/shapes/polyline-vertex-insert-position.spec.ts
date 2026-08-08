import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins that a midpoint handle inserts a polyline vertex at the right position
 * and in the right order.
 *
 * polyline-vertex.spec goes as far as the vertex count after insertion (3).
 * Dragging the midpoint handle of segment 0 (between endpoint 0 and endpoint 1)
 * must put the new vertex *between* those two (index 1), at the drop position.
 * A wrong order (appending, say) or a coordinate off the drop position survives
 * a check on the count alone.
 *
 * zoom=1, so points are absolute coordinates and the resulting array is matched
 * point by point.
 */

const TOLERANCE_PX = 1.5;

async function readVertices(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }[]> {
	const points = await canvas.objectById(id).getAttribute("points");
	if (!points) {
		throw new Error("the polyline has no points attribute");
	}
	return points
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** Drags from the center of the data-id control to the given content coordinates. */
async function dragControl(
	canvas: CanvasDriver,
	controlSelector: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`cannot locate the control ${controlSelector}`);
	}
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

function expectPointClose(
	actual: { x: number; y: number },
	expected: { x: number; y: number },
	label: string,
): void {
	expect(Math.abs(actual.x - expected.x), `x of ${label}`).toBeLessThanOrEqual(
		TOLERANCE_PX,
	);
	expect(Math.abs(actual.y - expected.y), `y of ${label}`).toBeLessThanOrEqual(
		TOLERANCE_PX,
	);
}

test.describe("position and order of a polyline vertex insertion", () => {
	test("inserts a vertex at the drop position between the endpoints (index 1) when segment 0's midpoint is dragged", async ({
		canvas,
	}) => {
		// Horizontal 2-point polyline [(300,300), (600,300)]; segment 0's midpoint is (450,300).
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		const before = await readVertices(canvas, id);
		expect(before).toHaveLength(2);

		// Drag the midpoint handle to (450,420) to insert a vertex.
		await dragControl(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ x: 450, y: 420 },
		);

		await expect
			.poll(() => readVertices(canvas, id).then((v) => v.length))
			.toBe(3);

		const after = await readVertices(canvas, id);
		// The endpoints stay put and the new vertex lands in the middle (index 1) at the drop position.
		expectPointClose(after[0], { x: 300, y: 300 }, "endpoint 0");
		expectPointClose(after[1], { x: 450, y: 420 }, "the inserted vertex");
		expectPointClose(after[2], { x: 600, y: 300 }, "endpoint 1");
	});
});
