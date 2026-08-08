import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Pins the destination coordinates of a polyline vertex drag.
 *
 * polyline-vertex-move.spec goes as far as points changing and undo/redo
 * round-tripping. The vertex handle sits on the vertex itself, so the grab
 * offset is 0 and the drop position becomes the new vertex coordinate. Points
 * are matched one by one so that only the grabbed vertex moves. Jumping to the
 * cursor, dragging a neighbour along, or landing off position all fail here.
 *
 * zoom=1, so points are absolute coordinates.
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

test.describe("destination coordinates of a polyline vertex move", () => {
	test("moves only the dragged vertex (index 1) onto the drop position", async ({
		canvas,
	}) => {
		// Horizontal 2-point polyline [(300,300), (600,300)].
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);

		// Move the right vertex (index 1) to (650,180); the handle sits on the vertex, so the offset is 0.
		await dragControl(canvas, `[data-id="${id}"][data-part="vertex:1"]`, {
			x: 650,
			y: 180,
		});

		await expect
			.poll(async () => (await readVertices(canvas, id))[1]?.y, {
				message: "vertex 1 moves",
			})
			.not.toBe(300);

		const after = await readVertices(canvas, id);
		expect(after).toHaveLength(2);
		// The grabbed vertex lands exactly on the drop position, the other is unchanged.
		expectPointClose(after[0], { x: 300, y: 300 }, "vertex 0 (unchanged)");
		expectPointClose(after[1], { x: 650, y: 180 }, "vertex 1 (destination)");
	});
});
