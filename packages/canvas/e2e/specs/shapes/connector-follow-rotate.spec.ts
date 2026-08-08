import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Connector following when the source shape is rotated.
 *
 * Connector endpoints resolve to an edge anchor on a shape. Rotating the shape turns the anchor
 * positions around its center, so the points have to update. Guards that the points change after
 * the rotation and keep following a subsequent move, which shows the connection survived.
 */

/** Joins two stacked rectangles with a vertical connector and returns its ID (left deselected) */
async function buildConnectedPair(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return connectorId;
}

test("keeps the connector following and the connection alive when the source is rotated", async ({
	canvas,
}) => {
	const connectorId = await buildConnectedPair(canvas);
	const points = () => canvas.objectById(connectorId).getAttribute("points");
	const initial = await points();

	// Rotate the source (the upper rectangle, centered at 500,200).
	await canvas.selectAt({ x: 500, y: 200 });
	await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });
	await expect
		.poll(points, { message: "the connector's anchor follows the rotation" })
		.not.toBe(initial);
	const afterRotate = await points();

	// The center (500,200) does not move under rotation, so grab there and drag right.
	await canvas.drag({ x: 500, y: 200 }, { x: 660, y: 200 });
	await expect
		.poll(points, { message: "it keeps following a move after the rotation" })
		.not.toBe(afterRotate);
});
