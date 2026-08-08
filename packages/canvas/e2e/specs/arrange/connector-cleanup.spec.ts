import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Connector integrity when a connected shape is deleted.
 *
 * connector.spec guards Delete on the connector itself, but the integrity of "what
 * happens to the connector when the shape it points at is deleted"
 * (cleanupConnectorsOnDelete) had no e2e coverage. Breaking it leaves orphan connectors
 * or fails coordinate resolution, which corrupts the document. The contract is:
 *
 * - Delete the shape at one end -> that end becomes Free and the connector stays
 *   (it keeps following the remaining shape)
 * - Delete the shapes at both ends -> the connector is deleted too
 * - Delete is a single command (cleanup included), so one undo brings back both the
 *   shapes and the connector
 *
 * Verified through observable invariants (object count, presence of the polyline,
 * points following the shape).
 */

const CONNECTOR = "polyline[data-kind=connector]";

/** Connects two vertically stacked rectangles with a vertical connector. Returns each data-id */
async function buildConnectedPair(canvas: CanvasDriver) {
	const topId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 150 },
		{ x: 600, y: 250 },
	);
	await canvas.deselect();
	const bottomId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 450 },
		{ x: 600, y: 550 },
	);
	await canvas.deselect();

	// Select the top rectangle and drag from its bottom anchor to the top-center of the
	// bottom rectangle to connect them
	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();

	// 2 rectangles + 1 connector = 3 objects
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(3);

	return { topId, bottomId, connectorId };
}

test.describe("connector integrity when connected shapes are deleted", () => {
	test("keeps the connector following the remaining shape when only one end shape is deleted", async ({
		canvas,
	}) => {
		const { topId, bottomId, connectorId } = await buildConnectedPair(canvas);

		// Delete only the top rectangle (the source end)
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.deleteSelection();

		// The deleted end becomes Free, so the connector survives with the bottom rectangle
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "1 rectangle and 1 connector remain",
			})
			.toBe(2);
		await expect(canvas.page.locator(CONNECTOR)).toHaveCount(1);
		await expect(canvas.objectById(topId)).toHaveCount(0);
		await expect(canvas.objectById(bottomId)).toBeVisible();

		const pointsBefore = await canvas
			.objectById(connectorId)
			.getAttribute("points");
		await canvas.drag({ x: 500, y: 500 }, { x: 800, y: 500 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "the connector follows the move of the remaining shape",
			})
			.not.toBe(pointsBefore);
	});

	test("deletes the connector when both end shapes are deleted and undo brings all three back", async ({
		canvas,
	}) => {
		await buildConnectedPair(canvas);

		// Select both rectangles (not the connector itself)
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.ctrlClickAt({ x: 500, y: 500 });
		await canvas.deleteSelection();

		// Both ends gone -> the connector is cleaned up as well
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "both the rectangles and the connector are gone",
			})
			.toBe(0);
		await expect(canvas.page.locator(CONNECTOR)).toHaveCount(0);

		// Delete is one command including cleanup, so one undo restores all three
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "undo restores 2 rectangles + 1 connector",
			})
			.toBe(3);
		await expect(canvas.page.locator(CONNECTOR)).toHaveCount(1);
	});
});
