import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/** Returns the polyline vertices, parsed from the "x,y x,y" points attribute. */
const readVertices = async (
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }[]> => {
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
};

/**
 * Axis locking under a Shift drag.
 * - Object move: moves along the axis with the larger delta only, and the guide
 *   for the locked axis appears.
 * - Vertex drag: locks the same way, taking the dragged vertex as the origin.
 * - Origin snap: near the start position it snaps back to the original position
 *   and both axis guides (a cross) appear.
 *
 * The axis lock guides live in the DOM only during the drag, so they are checked
 * before release (inside the dragInspecting callback). Final positions are
 * polled after release.
 */
test.describe("Shift axis lock", () => {
	test.describe("object move", () => {
		test("locks Y and shows the horizontal guide when the Shift drag is mostly horizontal", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			// Center (500,260) to (700,290): dx=200 > dy=30, so Y locks and it moves horizontally
			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 700, y: 290 },
				async () => {
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					await expect(canvas.axisLockGuides("x")).toHaveCount(0);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([260]);
				},
				{ shift: true },
			);

			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 700, 260)");
		});

		test("locks X and shows the vertical guide when the Shift drag is mostly vertical", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			// Center (500,260) to (530,460): dy=200 > dx=30, so X locks and it moves vertically
			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 530, y: 460 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(1);
					await expect(canvas.axisLockGuides("y")).toHaveCount(0);
					expect(await canvas.axisLockGuideCoordinates("x")).toEqual([500]);
				},
				{ shift: true },
			);

			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 500, 460)");
		});

		test("snaps to the origin and shows both axis guides near the start position", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			// Center (500,260) to (504,263): the free axis barely moves, so it snaps to the origin
			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 504, y: 263 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(1);
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					expect(await canvas.axisLockGuideCoordinates("x")).toEqual([500]);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([260]);
				},
				{ shift: true },
			);

			// Back at the original position
			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 500, 260)");
		});

		test("moves diagonally without Shift, with no axis lock and no guides", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 700, y: 460 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(0);
					await expect(canvas.axisLockGuides("y")).toHaveCount(0);
				},
			);

			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 700, 460)");
		});
	});

	test.describe("vertex drag", () => {
		test("locks Y and shows the horizontal guide when the Shift vertex drag is mostly horizontal", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Polyline",
				{ x: 400, y: 400 },
				{ x: 700, y: 450 },
			);
			// Selected right after drawing, so the vertex controls are shown
			await expect(canvas.objectById(id)).toBeVisible();
			const start = (await readVertices(canvas, id))[0];

			// Drag mostly horizontally from the start vertex: Y stays at the start vertex
			await canvas.dragInspecting(
				start,
				{ x: start.x + 200, y: start.y + 20 },
				async () => {
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					await expect(canvas.axisLockGuides("x")).toHaveCount(0);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([start.y]);
				},
				{ shift: true },
			);

			await expect
				.poll(async () => (await readVertices(canvas, id))[0])
				.toEqual({ x: start.x + 200, y: start.y });
		});

		test("snaps to the origin and shows both axis guides near the start vertex", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Polyline",
				{ x: 400, y: 400 },
				{ x: 700, y: 450 },
			);
			await expect(canvas.objectById(id)).toBeVisible();
			const start = (await readVertices(canvas, id))[0];

			// A tiny move snaps back to the start vertex and shows both guides
			await canvas.dragInspecting(
				start,
				{ x: start.x + 4, y: start.y + 3 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(1);
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					expect(await canvas.axisLockGuideCoordinates("x")).toEqual([start.x]);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([start.y]);
				},
				{ shift: true },
			);

			// Back at the start vertex
			await expect
				.poll(async () => (await readVertices(canvas, id))[0])
				.toEqual({ x: start.x, y: start.y });
		});
	});
});
