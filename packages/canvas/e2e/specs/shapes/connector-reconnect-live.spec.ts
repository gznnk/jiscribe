import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec for the live preview shown *while dragging* (before commit) when reconnecting a connector
 * endpoint.
 *
 * While the endpoint edit handle is dragged, the connector is redrawn in real time following the
 * cursor before release (handleDrag updates the object directly). connector-reconnect.spec covers
 * the committed result after release and undo, but the intermediate state during the drag was
 * untested. Without the preview the user cannot tell where the line will attach until releasing.
 *
 * Holds the drag open with dragInspecting to check that the connector end point follows the
 * current cursor position, and also that it settles there after release. At zoom=1, world
 * coordinates equal content coordinates.
 */

type Vec = { x: number; y: number };

const EPS = 3;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points attribute is missing");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

async function lastPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}

test.describe("live preview while reconnecting a connector", () => {
	test("end point follows the cursor while the endpoint handle is dragged and settles there on release", async ({
		canvas,
	}) => {
		// Join two stacked rectangles with a vertical connector (target is topCenter).
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 455,
		});
		await canvas.deselect();

		const initialLast = await lastPoint(canvas, connectorId);

		// Select the connector to show the target endpoint handle.
		await canvas.clickAt({ x: 500, y: 350 });
		const handle = canvas.page.locator(
			`[data-id="${connectorId}"][data-part="endpoint:target"]`,
		);
		await expect(handle).toBeVisible();
		const box = await handle.boundingBox();
		if (!box) {
			throw new Error("position of the target handle is not available");
		}
		const fromContent = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});

		// Drag the handle toward empty space and check the following while holding it.
		const dragTo = { x: 850, y: 300 };
		await canvas.dragInspecting(fromContent, dragTo, async () => {
			// The end point follows the cursor even before commit (live preview).
			await expect
				.poll(
					async () => distance(await lastPoint(canvas, connectorId), dragTo),
					{
						message: "end point follows the cursor during the drag",
					},
				)
				.toBeLessThanOrEqual(EPS);
			// It has really moved away from the initial position.
			expect(
				distance(await lastPoint(canvas, connectorId), initialLast),
			).toBeGreaterThan(50);
		});

		// After release the end point settles at the drop position (empty space = a free endpoint).
		await canvas.deselect();
		expect(
			distance(await lastPoint(canvas, connectorId), dragTo),
			"end point settles at the drop position after release",
		).toBeLessThanOrEqual(EPS);
	});
});
